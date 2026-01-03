'use client'
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShuffle, faPlus, faTrash, faX } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

export default function Home() {

  const [selectedMatches, setSelectedMatches] = useState<{ [key: string]: string }>({});
  const [marcador, setMarcador] = useState<{ homeScore: string; awayScore: string }>({ homeScore: "", awayScore: "" });
  const [name, setName] = useState<string>("");
  const [matches, setMatches] = useState<any[]>([]);
  const [internationalMatches, setInternationalMatches] = useState<any[]>([]);
  const [currentJornada, setCurrentJornada] = useState<string>("");
  const [currentLeague, setCurrentLeague] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [quinielasArray, setQuinielasArray] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("Cargando datos...");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  // Function to add current quiniela to array
  const addQuinielaToArray = () => {
    // Check if name is filled
    if (!name.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    // Check if all matches have a selection
    const totalMatches = matches.length + internationalMatches.length;
    if (Object.keys(selectedMatches).length < totalMatches) {
      alert('Por favor completa todas las selecciones de los partidos');
      return;
    }

    // Validate marcador for last Liga MX match
    if (matches.length > 0 && (!marcador.homeScore || !marcador.awayScore)) {
      alert('Por favor ingresa el marcador del último partido de Liga MX');
      return;
    }

    // Format selections: convert marcador format to score only (e.g., "3-2")
    const formattedSelections: { [key: string]: string } = {};
    Object.keys(selectedMatches).forEach((matchId) => {
      const selection = selectedMatches[matchId];
      if (selection.startsWith('marcador_')) {
        formattedSelections[matchId] = selection.replace('marcador_', '');
      } else {
        formattedSelections[matchId] = selection;
      }
    });

    const newQuiniela = {
      nombre: name,
      selecciones: formattedSelections,
      jornada: currentJornada,
      liga: 'Liga MX',
      includeBothLeagues: true,
      fecha: new Date().toISOString()
    };

    setQuinielasArray([...quinielasArray, newQuiniela]);

    // Clear form
    setSelectedMatches({});
    setMarcador({ homeScore: "", awayScore: "" });
    setName("");

    alert(`Quiniela de ${name} guardada. Total: ${quinielasArray.length + 1}`);
  };

  // Function to remove a quiniela from array
  const removeQuinielaFromArray = (index: number) => {
    const newArray = quinielasArray.filter((_, i) => i !== index);
    setQuinielasArray(newArray);
  };

  // Function to fill random selections
  const fillRandomSelections = () => {
    const randomSelections: { [key: string]: string } = {};

    // Handle Liga MX matches (all except the last one)
    matches.forEach((match, index) => {
      if (index < matches.length - 1) {
        const options = [
          `gana_local_${match.home_team}`,
          "empate",
          `gana_visitante_${match.away_team}`
        ];
        const randomIndex = Math.floor(Math.random() * options.length);
        randomSelections[match.match_id] = options[randomIndex];
      }
    });

    // Handle international matches (all with win/draw/lose)
    internationalMatches.forEach((match) => {
      const options = [
        `gana_local_${match.home_team}`,
        "empate",
        `gana_visitante_${match.away_team}`
      ];
      const randomIndex = Math.floor(Math.random() * options.length);
      randomSelections[match.match_id] = options[randomIndex];
    });

    // Generate random score for the last Liga MX match
    if (matches.length > 0) {
      const randomHome = Math.floor(Math.random() * 5); // 0-4 goals
      const randomAway = Math.floor(Math.random() * 5); // 0-4 goals
      setMarcador({ homeScore: randomHome.toString(), awayScore: randomAway.toString() });
      const lastMatch = matches[matches.length - 1];
      randomSelections[lastMatch.match_id] = `marcador_${randomHome}-${randomAway}`;
    }

    setSelectedMatches(randomSelections);
  };

  const sendDataToWhatsapp = async () => {
    // Check if current form has selections
    const totalMatches = matches.length + internationalMatches.length;
    const hasCurrentSelections = Object.keys(selectedMatches).length === totalMatches &&
      name.trim() &&
      marcador.homeScore &&
      marcador.awayScore;

    // If there's a current quiniela being filled, add it first
    if (hasCurrentSelections) {
      addQuinielaToArray();
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if there are quinielas to send (including the one we just added)
    const quinielasToSend = hasCurrentSelections ? [...quinielasArray, {
      nombre: name,
      selecciones: (() => {
        const formattedSelections: { [key: string]: string } = {};
        Object.keys(selectedMatches).forEach((matchId) => {
          const selection = selectedMatches[matchId];
          if (selection.startsWith('marcador_')) {
            formattedSelections[matchId] = selection.replace('marcador_', '');
          } else {
            formattedSelections[matchId] = selection;
          }
        });
        return formattedSelections;
      })(),
      jornada: currentJornada,
      liga: 'Liga MX',
      includeBothLeagues: true,
      fecha: new Date().toISOString()
    }] : quinielasArray;

    if (quinielasToSend.length === 0) {
      alert('Por favor completa al menos una quiniela antes de enviar');
      return;
    }

    setLoading(true);
    setMessage('Enviando respuestas...');

    try {
      // Send array of quinielas
      const response = await fetch('/api/quiniela', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quinielas: quinielasToSend
        })
      });

      const result = await response.json();

      if (response.status !== 200 || !result.success) {
        alert('Hubo un error al enviar las predicciones. Por favor intenta de nuevo.');
        setLoading(false);
        return;
      }
      console.log('Guardado exitoso:', result);

      // Format WhatsApp message
      const quinielaMatches = [...matches, ...internationalMatches];
      let whatsappMessage = `🎯 *La Quinielinha - Jornada ${currentJornada}*\n\n`;
      whatsappMessage += `📅 Del ${dateRange.start} al ${dateRange.end}\n`;
      whatsappMessage += `💰 Total: $${(quinielasToSend.length * 20).toFixed(2)}\n\n`;
      whatsappMessage += `━━━━━━━━━━━━━━━━\n\n`;

      // Iterate through each quiniela
      quinielasToSend.forEach((quiniela, index) => {
        whatsappMessage += `*Quiniela ${index + 1}: ${quiniela.nombre}*\n`;

        // Sort selections to maintain correct order
        const sortedSelections = Object.entries(quiniela.selecciones).sort(([matchIdA], [matchIdB]) => {
          const matchA = quinielaMatches.find(m => m.match_id === matchIdA);
          const matchB = quinielaMatches.find(m => m.match_id === matchIdB);

          if (!matchA || !matchB) return 0;

          const isLastLigaMXA = matchA.league === 'Liga MX' && matchIdA === matches[matches.length - 1]?.match_id;
          const isLastLigaMXB = matchB.league === 'Liga MX' && matchIdB === matches[matches.length - 1]?.match_id;

          if (isLastLigaMXA && matchB.league !== 'Liga MX') return -1;
          if (isLastLigaMXB && matchA.league !== 'Liga MX') return 1;

          const indexA = quinielaMatches.findIndex(m => m.match_id === matchIdA);
          const indexB = quinielaMatches.findIndex(m => m.match_id === matchIdB);
          return indexA - indexB;
        });

        // Format selections as a single line
        const selectionsText = sortedSelections.map(([matchId, selection]) => {
          const selectionStr = String(selection);

          if (/^\d+-\d+$/.test(selectionStr)) {
            return selectionStr; // Score
          } else if (selectionStr.includes('gana_local')) {
            return 'L';
          } else if (selectionStr === 'empate') {
            return 'E';
          } else if (selectionStr.includes('gana_visitante')) {
            return 'V';
          }
          return '';
        }).join(' - ');

        whatsappMessage += `${selectionsText}\n\n`;
      });

      // Encode message for WhatsApp URL
      const encodedMessage = encodeURIComponent(whatsappMessage);
      const whatsappURL = `https://wa.me/5215648496470?text=${encodedMessage}`;

      // Open WhatsApp in the same tab instead of new window
      window.location.href = whatsappURL;

      // Submission successful
      setLoading(false);
      setMessage('');
      alert(`${quinielasToSend.length} quiniela(s) enviada(s) correctamente. ¡Gracias por participar!`);

      // Clear data
      setQuinielasArray([]);
      setSelectedMatches({});
      setMarcador({ homeScore: "", awayScore: "" });
      setName("");

    } catch (error) {
      console.error("Error al enviar las quinielas: ", error);
      alert('Hubo un error al conectar con Google Sheets');
      setLoading(false);
      return;
    }
  }

  useEffect(() => {
    const fetchData = async (sheetName = 'Liga MX') => {
      console.log(sheetName);
      const response = await fetch(`/api/quiniela?sheet=${encodeURIComponent(sheetName)}`);
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setLoading(false);

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        // Process matches based on sheet name
        const matchesData = data.data.slice(1).map((row: string[]) => {
          let formattedDate = row[4];
          let dateOnly = row[4];
          try {
            const date = new Date(row[4]);

            // Track min and max dates
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;


            formattedDate = date.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })

            //Date without time
            dateOnly = date.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          } catch (error) {
            formattedDate = row[4];
          }

          return {
            match_id: row[0],
            home_team: row[1],
            away_team: row[2],
            league: row[3],
            date: formattedDate,
            dateOnly: dateOnly,
            jornada: row[5]
          }

        });

        setMatches(matchesData);

        // Set date range
        if (minDate && maxDate) {
          const startOptions: Intl.DateTimeFormatOptions = { day: 'numeric' };
          const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
          setDateRange({
            start: (minDate as Date).toLocaleDateString('es-MX', startOptions),
            end: (maxDate as Date).toLocaleDateString('es-MX', options)
          })
        }

        if (matchesData.length > 0) {
          setCurrentJornada(matchesData[0].jornada);
          setCurrentLeague(matchesData[0].league);
        }
      }
    };

    fetchData('Liga MX');
    // For international matches

    const fetchInternationalData = async (sheetName = 'Ligas internacionales') => {
      const response = await fetch(`/api/quiniela?sheet=${encodeURIComponent(sheetName)}`);
      const data = await response.json();

      console.log(data)
      if (data.data && Array.isArray(data.data)) {
        // Process matches based on sheet name
        const matchesData = data.data.slice(1).map((row: string[]) => ({
          match_id: row[0],
          home_team: row[1],
          away_team: row[2],
          league: row[3],
        }));

        setInternationalMatches(matchesData);
      }
    }

    fetchInternationalData('Ligas internacionales');

  }, []);

  return (
    <div className={`${styles.page} text-center pt-2 pb-5`}>
      {loading && <p>{message}</p>}

      {!loading && (
        <form onSubmit={(e) => {
          e.preventDefault();
          sendDataToWhatsapp();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        >

          {matches.length > 0 && (
            <div>
              {/* <h3>Partidos - {currentLeague} Jornada {currentJornada}</h3> */}

              {dateRange.start && dateRange.end && (
                <div className={`${styles.title} mb-3`}>
                  <h2>La Quinielinha</h2>
                  <div>
                    <span>Jornada {currentJornada}</span>
                    <span>Del {dateRange.start} al {dateRange.end}</span>
                  </div>
                </div>
              )}

              {/* Desktop Table - Hidden on mobile */}
              <div className="table-responsive d-none d-md-block container">
                <table className="table table-hover table-bordered">

                  <thead className="table-primary">
                    <tr>
                      <th scope="col">Local</th>
                      <th scope="col">Equipo Local</th>
                      <th scope="col">Empate</th>
                      <th scope="col">Equipo Visitante</th>
                      <th scope="col" >Visitante</th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* Liga MX - Desktop */}
                    {matches.map((match, index) => {
                      const isLastMatch = index === matches.length - 1;
                      const selection = selectedMatches[match.match_id];
                      const isHomeSelected = selection === `gana_local_${match.home_team}`;
                      const isDrawSelected = selection === "empate";
                      const isAwaySelected = selection === `gana_visitante_${match.away_team}`;

                      let rowClass = "";
                      if (isHomeSelected) rowClass = "table-success";
                      else if (isDrawSelected) rowClass = "table-warning";
                      else if (isAwaySelected) rowClass = "table-info";

                      // Special rendering for the last match (marcador)
                      if (isLastMatch) {
                        return (
                          <tr key={match.match_id} className="table-active">
                            <td colSpan={1} className="text-end fw-semibold align-middle">
                              {match.home_team}
                            </td>
                            <td colSpan={3} className="align-middle">
                              <div className="d-flex align-items-center gap-2 justify-content-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  className="form-control text-center"
                                  style={{ width: '60px' }}
                                  placeholder="0"
                                  value={marcador.homeScore}
                                  onChange={(e) => {
                                    const newHome = e.target.value;
                                    setMarcador({ ...marcador, homeScore: newHome });
                                    if (newHome && marcador.awayScore) {
                                      setSelectedMatches({
                                        ...selectedMatches,
                                        [match.match_id]: `marcador_${newHome}-${marcador.awayScore}`
                                      });
                                    }
                                  }}
                                />
                                <span className="fw-bold">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  className="form-control text-center"
                                  style={{ width: '60px' }}
                                  placeholder="0"
                                  value={marcador.awayScore}
                                  onChange={(e) => {
                                    const newAway = e.target.value;
                                    setMarcador({ ...marcador, awayScore: newAway });
                                    if (marcador.homeScore && newAway) {
                                      setSelectedMatches({
                                        ...selectedMatches,
                                        [match.match_id]: `marcador_${marcador.homeScore}-${newAway}`
                                      });
                                    }
                                  }}
                                />

                              </div>

                              <small className="text-muted d-block text-center mt-1">Marcador exacto</small>

                            </td>

                            <td colSpan={1} className="text-end fw-semibold align-middle">
                              {match.away_team}
                            </td>
                            <td className="text-center align-middle">
                              {match.date}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={match.match_id} className={rowClass}>

                          {/* Local */}
                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: `gana_local_${match.home_team}`,
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`home-win-${match.match_id}`}
                              value={`gana_local_${match.home_team}`}
                              checked={isHomeSelected}
                              onChange={() => { }}
                            />
                            {isHomeSelected && <span className="badge bg-success">✓</span>}
                            {!isHomeSelected && <span className="text-muted">L</span>}
                          </td>

                          <td className="text-end fw-semibold">{match.home_team}</td>

                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: "empate",
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`draw-${match.match_id}`}
                              value="empate"
                              checked={isDrawSelected}
                              onChange={() => { }}
                            />
                            {isDrawSelected && <span className="badge bg-warning">✓</span>}
                            {!isDrawSelected && <span className="text-muted">E</span>}
                          </td>

                          <td className="text-start fw-semibold">{match.away_team}</td>

                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: `gana_visitante_${match.away_team}`,
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`away-win-${match.match_id}`}
                              value={`gana_visitante_${match.away_team}`}
                              checked={isAwaySelected}
                              onChange={() => { }}
                            />
                            {isAwaySelected && <span className="badge bg-info">✓</span>}
                            {!isAwaySelected && <span className="text-muted">V</span>}
                          </td>

                          <td className="text-center">
                            {match.date}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards - Hidden on desktop */}
              <div className={`${styles.mobileLigaMx} d-block d-md-none`}>
                <table className="table-responsive table-borderless">
                  <thead className="table-borderless">
                    <tr>
                      <th scope="col">Local</th>
                      <th scope="col"></th>
                      <th scope="col">Empate</th>
                      <th scope="col"></th>
                      <th scope="col">Visita</th>
                    </tr>
                  </thead>

                  <tbody>
                    {matches.map((match, index) => {
                      const isLastMatch = index === matches.length - 1;
                      const selection = selectedMatches[match.match_id];
                      const isHomeSelected = selection === `gana_local_${match.home_team}`;
                      const isDrawSelected = selection === "empate";
                      const isAwaySelected = selection === `gana_visitante_${match.away_team}`;
                      // const showDateheader = index === 0 || matches[index - 1].dateOnly !== match.dateOnly;
                      // Special rendering for the last match (marcador)
                      if (isLastMatch) {
                        return (
                          <tr key={match.match_id}>
                            <td colSpan={5}>
                              <div className="px-2">
                                <span>
                                  {index > 6 && (<strong className={`${styles.spanNumber}`}>{index + 1}</strong>)}
                                </span>

                                {/* Teams Header */}
                                <div className="d-flex justify-content-between align-items-center gap-1">
                                  <span className={`${styles.team} fw-bold`}>{match.home_team}</span>

                                  {/* Marcador Input */}
                                  <div className="text-center">

                                    <div className="d-flex align-items-center gap-1 justify-content-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="9"
                                        className="form-control form-control-lg text-center"
                                        style={{ width: "50px", fontSize: ".9rem" }}
                                        placeholder="0"
                                        value={marcador.homeScore}
                                        onChange={(e) => {
                                          const newHome = e.target.value;
                                          setMarcador({ ...marcador, homeScore: newHome });
                                          if (newHome && marcador.awayScore) {
                                            setSelectedMatches({
                                              ...selectedMatches,
                                              [match.match_id]: `marcador_${newHome}-${marcador.awayScore}`
                                            });
                                          }
                                        }}
                                      />

                                      <input
                                        type="number"
                                        min="0"
                                        max="9"
                                        className="form-control form-control-lg text-center"
                                        style={{ width: "50px", fontSize: ".9rem" }}
                                        placeholder="0"
                                        value={marcador.awayScore}
                                        onChange={(e) => {
                                          const newAway = e.target.value;
                                          setMarcador({ ...marcador, awayScore: newAway });
                                          if (marcador.homeScore && newAway) {
                                            setSelectedMatches({
                                              ...selectedMatches,
                                              [match.match_id]: `marcador_${marcador.homeScore}-${newAway}`
                                            });
                                          }
                                        }}
                                      />
                                    </div>

                                  </div>

                                  <span className={`${styles.team} fw-bold`}>{match.away_team}</span>
                                </div>

                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={index} className="mb-3">
                          <td
                            className={`align-middle p-1`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_local_${match.home_team}`,
                              })
                            }
                          >
                            <span>
                              {index > 6 && (<strong className={`${styles.spanNumber}`}>{index + 1}</strong>)}
                            </span>

                            {/* Local Button */}
                            <span className={`${styles.marcador} ${isHomeSelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isHomeSelected && ''} L
                            </span>
                          </td>

                          <td className="text-center align-middle">
                            <span className={`${styles.team} fw-bold`}>{match.home_team}</span>
                          </td>

                          <td
                            className={`align-middle`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: "empate",
                              })
                            }
                          >
                            {/* Draw Button */}
                            <span className={`${styles.marcador} ${isDrawSelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isDrawSelected && ''} E
                            </span>
                          </td>

                          <td className="align-middle">
                            <span className={`${styles.team} fw-bold`}>{match.away_team}</span>
                          </td>

                          <td
                            className={`align-middle`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_visitante_${match.away_team}`,
                              })
                            }
                          >
                            {/* Away Button */}
                            <span className={`${styles.marcador} ${isAwaySelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isAwaySelected && ''} V
                            </span>
                          </td>

                          <td className="d-none">
                            {/* Hidden radio inputs for form validation */}
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value={`gana_local_${match.home_team}`}
                              checked={isHomeSelected}
                              onChange={() => { }}
                            />
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value="empate"
                              checked={isDrawSelected}
                              onChange={() => { }}
                            />
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value={`gana_visitante_${match.away_team}`}
                              checked={isAwaySelected}
                              onChange={() => { }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* International Matches */}

          {internationalMatches.length > 0 && (
            <div className="mb-4">
              {/* <h4>Partidos Internacionales</h4> */}

              {/* Desktop Table - Hidden on mobile */}
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover table-bordered">
                  <thead className="table-primary">
                    <tr>
                      <th scope="col">Local</th>
                      <th scope="col">Equipo Local</th>
                      <th scope="col">Empate</th>
                      <th scope="col">Equipo Visitante</th>
                      <th scope="col">Visitante</th>
                      <th scope="col">Competencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internationalMatches.map((match) => {
                      const selection = selectedMatches[match.match_id];
                      const isHomeSelected = selection === `gana_local_${match.home_team}`;
                      const isDrawSelected = selection === "empate";
                      const isAwaySelected = selection === `gana_visitante_${match.away_team}`;

                      let rowClass = "";
                      if (isHomeSelected) rowClass = "table-success";
                      else if (isDrawSelected) rowClass = "table-warning";
                      else if (isAwaySelected) rowClass = "table-info";

                      return (
                        <tr key={match.match_id} className={rowClass}>

                          {/* Local */}
                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: `gana_local_${match.home_team}`,
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`home-win-${match.match_id}`}
                              value={`gana_local_${match.home_team}`}
                              checked={isHomeSelected}
                              onChange={() => { }}
                            />
                            {isHomeSelected && <span className="badge bg-success">✓</span>}
                            {!isHomeSelected && <span className="text-muted">L</span>}
                          </td>

                          <td className="text-end fw-semibold">{match.home_team}</td>

                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: "empate",
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`draw-${match.match_id}`}
                              value="empate"
                              checked={isDrawSelected}
                              onChange={() => { }}
                            />
                            {isDrawSelected && <span className="badge bg-warning">✓</span>}
                            {!isDrawSelected && <span className="text-muted">E</span>}
                          </td>

                          <td className="text-start fw-semibold">{match.away_team}</td>

                          <td className="text-center" style={{ cursor: 'pointer' }} onClick={() =>
                            setSelectedMatches({
                              ...selectedMatches,
                              [match.match_id]: `gana_visitante_${match.away_team}`,
                            })
                          }>
                            <input
                              className="form-check-input d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              id={`away-win-${match.match_id}`}
                              value={`gana_visitante_${match.away_team}`}
                              checked={isAwaySelected}
                              onChange={() => { }}
                            />
                            {isAwaySelected && <span className="badge bg-info">✓</span>}
                            {!isAwaySelected && <span className="text-muted">V</span>}
                          </td>

                          <td className="text-center">
                            {match.league}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards - Hidden on desktop */}
              <div className={`${styles.mobileLigaMx} d-block d-md-none px-3`}>
                <table className="table table-sm table-borderless mt-2 mb-3 px-2">
                  <tbody>
                    {internationalMatches.map((match, index) => {
                      const selection = selectedMatches[match.match_id];
                      const isHomeSelected = selection === `gana_local_${match.home_team}`;
                      const isDrawSelected = selection === "empate";
                      const isAwaySelected = selection === `gana_visitante_${match.away_team}`;

                      return (
                        <tr key={match.match_id} className="mb-3">
                          <td
                            width={'30px'}
                            className={`align-middle`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_local_${match.home_team}`,
                              })
                            }
                          >
                            <span>
                              {index >= 0 && (<strong className={`${styles.spanNumber}`}>{index + 10}</strong>)}
                            </span>
                            {/* Local Button */}
                            <span className={`${styles.marcador} ${isHomeSelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isHomeSelected && ''} L
                            </span>
                          </td>

                          <td className="text-center align-middle">
                            <span className={`${styles.team} fw-bold`}>{match.home_team}</span>
                          </td>

                          <td
                            width={'30px'}
                            className={`align-middle`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: "empate",
                              })
                            }
                          >
                            {/* Draw Button */}
                            <span className={`${styles.marcador} ${isDrawSelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isDrawSelected && ''} E
                            </span>
                          </td>

                          <td className="align-middle">
                            <span className={`${styles.team} fw-bold`}>{match.away_team}</span>
                          </td>

                          <td
                            width={'30px'}
                            className={`align-middle`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_visitante_${match.away_team}`,
                              })
                            }
                          >
                            {/* Away Button */}
                            <span className={`${styles.marcador} ${isAwaySelected ? 'text-bg-warning' : 'btn-outline-success'}`}>
                              {isAwaySelected && ''} V
                            </span>
                          </td>
                          <td className="d-none">
                            {/* Hidden radio inputs for form validation */}
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value={`gana_local_${match.home_team}`}
                              checked={isHomeSelected}
                              onChange={() => { }}
                            />
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value="empate"
                              checked={isDrawSelected}
                              onChange={() => { }}
                            />
                            <input
                              className="d-none"
                              type="radio"
                              name={`match-${match.match_id}`}
                              value={`gana_visitante_${match.away_team}`}
                              checked={isAwaySelected}
                              onChange={() => { }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Saved Quinielas List */}
          {quinielasArray.length > 0 && (
            <div className="mb-4">
              <div>
                {/* Saved Quinielas List */}
                {quinielasArray.length > 0 && (
                  <div className="ps-3 pe-3">
                    {quinielasArray.map((quiniela, index) => {
                      // Get all matches for this quiniela
                      const quinielaMatches = [...matches, ...internationalMatches];

                      // Sort selections to show them in the correct order
                      const sortedSelections = Object.entries(quiniela.selecciones).sort(([matchIdA], [matchIdB]) => {
                        const matchA = quinielaMatches.find(m => m.match_id === matchIdA);
                        const matchB = quinielaMatches.find(m => m.match_id === matchIdB);

                        if (!matchA || !matchB) return 0;

                        // Check if it's the last Liga MX match (marcador)
                        const isLastLigaMXA = matchA.league === 'Liga MX' && matchIdA === matches[matches.length - 1]?.match_id;
                        const isLastLigaMXB = matchB.league === 'Liga MX' && matchIdB === matches[matches.length - 1]?.match_id;

                        // If A is last Liga MX match, it should come before international matches
                        if (isLastLigaMXA && matchB.league !== 'Liga MX') return -1;
                        if (isLastLigaMXB && matchA.league !== 'Liga MX') return 1;

                        // Otherwise maintain original order based on match list
                        const indexA = quinielaMatches.findIndex(m => m.match_id === matchIdA);
                        const indexB = quinielaMatches.findIndex(m => m.match_id === matchIdB);
                        return indexA - indexB;
                      });

                      return (
                        <div key={index} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            {/* Display selections */}
                            <div>
                              <div className="d-flex flex-wrap align-middle gap-2">
                                {sortedSelections.map(([matchId, selection]) => {
                                  const match = quinielaMatches.find(m => m.match_id === matchId);
                                  if (!match) return null;

                                  let displayValue = '';
                                  const selectionStr = String(selection);

                                  // Check if it's a score (contains only numbers and dash)
                                  if (/^\d+-\d+$/.test(selectionStr)) {
                                    displayValue = selectionStr;
                                  } else if (selectionStr.includes('gana_local')) {
                                    displayValue = 'L';
                                  } else if (selectionStr === 'empate') {
                                    displayValue = 'E';
                                  } else if (selectionStr.includes('gana_visitante')) {
                                    displayValue = 'V';
                                  }

                                  return (
                                    <span key={matchId} className="fw-bold" style={{ fontSize: '0.9rem', color: '#03939A' }}>
                                      {displayValue}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <FontAwesomeIcon
                              onClick={() => removeQuinielaFromArray(index)}
                              icon={faX}
                              width={65}
                              style={{ color: '#03939A', cursor: 'pointer' }}
                            />

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}

          <div className={`${styles.footer}`}>

            <div className="d-flex flex-column justify-content-between">
              <p className="m-0 fw-bold text-warning">
                <span className="text-light">Entrada:</span> $20.00
              </p>

              <p className="m-0 fw-bold text-warning">
                <span className="text-light">Cierre:</span> Viernes 18:00 hrs
              </p>

              <p className="m-0 fw-bold text-warning">
                <span className="text-light">Informes:</span> 56 4849 6470
              </p>
            </div>

            <div className={`${styles.nameInput}`}>
              <label htmlFor="name" className="d-block">
                Nombre:
                <input id="name" type="text" className="form-control mt-2" value={name} onChange={e => setName(e.target.value)} />
              </label>
            </div>

            {/* Total - Show current total including unsaved quiniela if being filled */}
            <div className="mb-4">
              <h5 className="fw-bold">
                Precio: <span>${((quinielasArray.length + (name.trim() && Object.keys(selectedMatches).length > 0 ? 1 : 0)) * 20).toFixed(2)}</span>
              </h5>
            </div>

            <div className={`${styles.instructions} mb-4`}>
              <p>
                Pasos para enviar tu quiniela 📝
              </p>
              <ul>
                <li>
                  Entra al link de la quiniela
                </li>
                <li>
                  Llena tus pronósticos
                </li>
                <li>
                  Escribe el nombre de tu quiniela
                </li>
                <li>
                  Da clic en <u>Agregar</u> quiniela (+)
                </li>
                <li>
                  Cuando termines, da clic en Enviar por WhatsApp
                </li>
                <li>
                  Se enviará automáticamente al WhatsApp de La Quinielinha
                </li>
              </ul>

              <span>
                ⚠️ Importante <br />
                Si haces más de una quiniela, agrega cada una con (+)
                Si no presionas <u>Agregar</u> quiniela (+) antes de enviar, el mensaje llegará en blanco.
                <br />
                Puedes <u>limpiar</u> tu quiniela o usar <u>aleatorio</u> con los botones extra. 
              </span>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <div className={`${styles.buttonGroup} d-flex justify-content-between gap-2`}>

                <button type="button" className="btn btn-warning" onClick={() => {
                  setSelectedMatches({});
                  setMarcador({ homeScore: "", awayScore: "" });
                }}>
                  <FontAwesomeIcon icon={faTrash} width={65} />
                </button>

                <button type="button" className="btn btn-warning" onClick={addQuinielaToArray}>
                  <FontAwesomeIcon icon={faPlus} width={65} />
                </button>

                <button type="button" className="btn btn-warning" onClick={fillRandomSelections}>
                  <FontAwesomeIcon icon={faShuffle} width={65} />
                </button>
              </div>

              {/* Always show send button */}
              <button type="submit" className="btn btn-success">
                Enviar <FontAwesomeIcon icon={faWhatsapp} style={{ color: '#FFF' }} width={85} />
              </button>
            </div>

          </div>


        </form>
      )}
    </div>
  );
}