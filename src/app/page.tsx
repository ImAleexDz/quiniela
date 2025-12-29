'use client'
import styles from "./page.module.css";
import { useState, useEffect } from "react";

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
    // Check if there are quinielas to send
    if (quinielasArray.length === 0) {
      alert('No hay quinielas guardadas para enviar');
      return;
    }

    try {
      // Send array of quinielas
      const response = await fetch('/api/quiniela', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quinielas: quinielasArray
        })
      });

      const result = await response.json();

      if (response.status !== 200 || !result.success) {
        alert('Hubo un error al enviar las predicciones. Por favor intenta de nuevo.');
        return;
      }

      console.log('Guardado exitoso:', result);

      // Submission successful
      alert(`${quinielasArray.length} quiniela(s) enviada(s) correctamente. ¡Gracias por participar!`);
      setQuinielasArray([]);
      setSelectedMatches({});
      setMarcador({ homeScore: "", awayScore: "" });
      setName("");
      return;
    } catch (error) {
      console.error("Error al enviar las quinielas: ", error);
      alert('Hubo un error al conectar con Google sheets')
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
        // Process matches based on sheet name
        const matchesData = data.data.slice(1).map((row: string[]) => ({
          match_id: row[0],
          home_team: row[1],
          away_team: row[2],
          league: row[3],
          date: row[4],
          jornada: row[5]
        }));

        setMatches(matchesData);

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
    <div className={`${styles.page} text-center mt-5 mb-5`}>
      {loading && <p>Cargando datos de la quiniela...</p>}

      {!loading && (
        <form onSubmit={(e) => {
          e.preventDefault();
          sendDataToWhatsapp();
        }}>

          {matches.length > 0 && (
            <div className="mb-4">
              <h3>Partidos - {currentLeague} Jornada {currentJornada}</h3>

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
                      <th scope="col">Fecha</th>
                    </tr>
                  </thead>

                  <tbody>
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
              <div className="d-block d-md-none">
                {matches.map((match, index) => {
                  const isLastMatch = index === matches.length - 1;
                  const selection = selectedMatches[match.match_id];
                  const isHomeSelected = selection === `gana_local_${match.home_team}`;
                  const isDrawSelected = selection === "empate";
                  const isAwaySelected = selection === `gana_visitante_${match.away_team}`;

                  // Special rendering for the last match (marcador)
                  if (isLastMatch) {
                    return (
                      <div key={match.match_id} className="card mb-3 border-primary">
                        <div className="card-body">
                          {/* Teams Header */}
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-bold text-primary">{match.home_team}</span>
                            <span className="text-muted">VS</span>
                            <span className="fw-bold text-danger">{match.away_team}</span>
                          </div>

                          {/* Marcador Input */}
                          <div className="text-center">
                            <label className="form-label fw-bold text-primary">Marcador exacto</label>
                            <div className="d-flex align-items-center gap-2 justify-content-center">
                              <input
                                type="number"
                                min="0"
                                max="99"
                                className="form-control form-control-lg text-center"
                                style={{ width: '80px' }}
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
                              <span className="fw-bold fs-4">-</span>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                className="form-control form-control-lg text-center"
                                style={{ width: '80px' }}
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
                            <small className="text-muted">Ingresa el resultado exacto</small>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={match.match_id} className="card mb-3">
                      <div className="card-body">

                        {/* Teams Header */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="fw-bold text-primary">{match.home_team}</span>
                          <span className="text-muted">VS</span>
                          <span className="fw-bold text-danger">{match.away_team}</span>
                        </div>

                        {/* Prediction Buttons */}
                        <div className="d-grid gap-2">

                          {/* Local Button */}
                          <button
                            type="button"
                            className={`btn ${isHomeSelected ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_local_${match.home_team}`,
                              })
                            }
                          >
                            {isHomeSelected && '✓ '} Gana {match.home_team}
                          </button>

                          {/* Draw Button */}
                          <button
                            type="button"
                            className={`btn ${isDrawSelected ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: "empate",
                              })
                            }
                          >
                            {isDrawSelected && '✓ '} Empate
                          </button>

                          {/* Away Button */}
                          <button
                            type="button"
                            className={`btn ${isAwaySelected ? 'btn-info' : 'btn-outline-info'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_visitante_${match.away_team}`,
                              })
                            }
                          >
                            {isAwaySelected && '✓ '} Gana {match.away_team}
                          </button>

                        </div>

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

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* International Matches */}

          {internationalMatches.length > 0 && (
            <div className="mb-4">
              <h3>Partidos Internacionales</h3>

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
              <div className="d-block d-md-none">
                {internationalMatches.map((match) => {
                  const selection = selectedMatches[match.match_id];
                  const isHomeSelected = selection === `gana_local_${match.home_team}`;
                  const isDrawSelected = selection === "empate";
                  const isAwaySelected = selection === `gana_visitante_${match.away_team}`;

                  return (
                    <div key={match.match_id} className="card mb-3">
                      <div className="card-body">

                        {/* Teams Header */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="fw-bold text-primary">{match.home_team}</span>
                          <span className="text-muted">VS</span>
                          <span className="fw-bold text-danger">{match.away_team}</span>
                        </div>

                        {/* Prediction Buttons */}
                        <div className="d-grid gap-2">

                          {/* Local Button */}
                          <button
                            type="button"
                            className={`btn ${isHomeSelected ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_local_${match.home_team}`,
                              })
                            }
                          >
                            {isHomeSelected && '✓ '} Gana {match.home_team}
                          </button>

                          {/* Draw Button */}
                          <button
                            type="button"
                            className={`btn ${isDrawSelected ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: "empate",
                              })
                            }
                          >
                            {isDrawSelected && '✓ '} Empate
                          </button>

                          {/* Away Button */}
                          <button
                            type="button"
                            className={`btn ${isAwaySelected ? 'btn-info' : 'btn-outline-info'}`}
                            onClick={() =>
                              setSelectedMatches({
                                ...selectedMatches,
                                [match.match_id]: `gana_visitante_${match.away_team}`,
                              })
                            }
                          >
                            {isAwaySelected && '✓ '} Gana {match.away_team}
                          </button>

                        </div>

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

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}


          <div className="justify-content-center">
            <label htmlFor="name" className="mt-3 mb-3 d-block">
              Nombre:
            <input id="name" type="text" className="form-control mt-2" value={name} onChange={e => setName(e.target.value)} />
            </label>
          </div>

          {/* Saved Quinielas List */}
          {quinielasArray.length > 0 && (
            <div className="mb-4">
              <h4>Quinielas Guardadas ({quinielasArray.length})</h4>
              <div className="list-group">
                {quinielasArray.map((quiniela, index) => (
                  <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <strong>{quiniela.nombre}</strong> - Jornada {quiniela.jornada}
                    </span>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-danger"
                      onClick={() => removeQuinielaFromArray(index)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                <div className="mt-4">
                  <h3>
                    Precio: <span>${quinielasArray.length * 10}</span>
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setSelectedMatches({});
              setMarcador({ homeScore: "", awayScore: "" });
            }}>
              Limpiar selecciones
            </button>

            <button type="button" className="btn btn-info" onClick={fillRandomSelections}>
              Llenar al azar
            </button>

            <button type="button" className="btn btn-success" onClick={addQuinielaToArray}>
              Guardar quiniela
            </button>

            {quinielasArray.length > 0 && (
              <button type="submit" className="btn btn-primary">
                Enviar todas ({quinielasArray.length})
              </button>
            )}
          </div>

        </form>
      )}
    </div>
  );
}