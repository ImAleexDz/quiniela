'use client'
import styles from "./page.module.css";
import { useState, useEffect } from "react";

export default function Home() {

  const [selectedMatches, setSelectedMatches] = useState<{ [key: string]: string }>({});
  const [name, setName] = useState<string>("");
  const [matches, setMatches] = useState<any[]>([]);
  const [currentJornada, setCurrentJornada] = useState<string>("");
  const [currentLeague, setCurrentLeague] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const sendDataToWhatsapp = async () => {
    // Check if name is filled
    if (!name.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    // Check if all matches are selected
    const missingMatches = matches.filter(match => !selectedMatches[match.match_id]);
    
    if (missingMatches.length > 0) {
      const missingTeams = missingMatches.map(match => `${match.home_team} vs ${match.away_team}`).join('\n');
      alert(`Por favor completa todas las predicciones. Te faltan:\n\n${missingTeams}`);
      return;
    }

    try {
      const response = await fetch('/api/quiniela', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: name,
          selecciones: selectedMatches,
          jornada: currentJornada,
          liga: currentLeague,
          fecha: new Date().toISOString()
        })
      });

      const result = await response.json();

      if(!result.success) {
        alert('Hubo un error al enviar tu quiniela. Por favor intenta de nuevo.');
        return;
      }
      console.log("Guardado existoso: ", result);
    } catch (error) {
      console.error("Error al enviar la quiniela: ", error);
      alert('Hubo un error al conectar con Google sheets')
      return;
    }


  }

  useEffect(() => {
    fetch('/api/quiniela').then(res => res.json()).then(data => {
      console.log(data);
      if (data.data && Array.isArray(data.data)) {
        setLoading(false);
        // Extract matches from data
        // Structure: [id_partido, equipo_local, equipo_visitante, info_liga, jornada]
        const matchesData = data.data.slice(1).map((row: string[]) => ({
          match_id: row[0], // id_partido
          home_team: row[1], // equipo_local
          away_team: row[2], // equipo_visitante
          league: row[3], // info_liga
          jornada: row[4] // jornada
        }));
        
        setMatches(matchesData);
        // Set current jornada and league dynamically (get from first match)
        if (matchesData.length > 0) {
          setCurrentJornada(matchesData[0].jornada);
          setCurrentLeague(matchesData[0].league);
        }
        
        console.log('Extracted matches:', matchesData);
      }
    });
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

            <label htmlFor="name" className="mb-3 d-block">
              Nombre:
              <input id="name" type="text" className="form-control mt-2" onChange={e => setName(e.target.value)}/>
            </label>

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
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
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
                        <td className="text-center" style={{cursor: 'pointer'}} onClick={() => 
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
                            onChange={() => {}}
                          />
                          {isHomeSelected && <span className="badge bg-success">✓</span>}
                          {!isHomeSelected && <span className="text-muted">L</span>}
                        </td>

                        <td className="text-end fw-semibold">{match.home_team}</td>

                        <td className="text-center" style={{cursor: 'pointer'}} onClick={() => 
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
                            onChange={() => {}}
                          />
                          {isDrawSelected && <span className="badge bg-warning">✓</span>}
                          {!isDrawSelected && <span className="text-muted">E</span>}
                        </td>

                        <td className="text-start fw-semibold">{match.away_team}</td>

                        <td className="text-center" style={{cursor: 'pointer'}} onClick={() => 
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
                            onChange={() => {}}
                          />
                          {isAwaySelected && <span className="badge bg-info">✓</span>}
                          {!isAwaySelected && <span className="text-muted">V</span>}
                        </td>
                        
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Hidden on desktop */}
            <div className="d-block d-md-none">
              {matches.map((match) => {
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
                        onChange={() => {}}
                      />
                      <input
                        className="d-none"
                        type="radio"
                        name={`match-${match.match_id}`}
                        value="empate"
                        checked={isDrawSelected}
                        onChange={() => {}}
                      />
                      <input
                        className="d-none"
                        type="radio"
                        name={`match-${match.match_id}`}
                        value={`gana_visitante_${match.away_team}`}
                        checked={isAwaySelected}
                        onChange={() => {}}
                      />
                      
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedMatches({})}>
            Limpiar selecciones
          </button>

          <button type="submit" className="btn btn-primary">
            Enviar quiniela
          </button>
        </div>
        
      </form>
      )}
    </div>
  );
}