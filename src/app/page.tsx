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

  const sendDataToWhatsapp = () => {
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

    let message = `Quiniela de ${name}\n\n`;

    matches.forEach((match) => {
      const result = selectedMatches[match.match_id] || "No seleccionado";
      message += `${match.home_team} vs ${match.away_team}: ${result}\n`;
    });
    const whatsappUrl = `https://wa.me/5575209743?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
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

        {/* Matches Table */}

        {matches.length > 0 && (
          <div className="mb-4">
            <h3>Partidos - {currentLeague} Jornada {currentJornada}</h3>

            <label htmlFor="name" className="mb-3">
              Nombre:
              <input id="name" type="text" onChange={e => setName(e.target.value)}/>
            </label>

            <div className="table-responsive">
              <table className="table table-hover table-bordered">
                <thead className="table-primary">
                  <tr>
                    <th scope="col">Equipo Local</th>
                    <th scope="col">Local</th>
                    <th scope="col">Empate</th>
                    <th scope="col">Visitante</th>
                    <th scope="col">Equipo Visitante</th>
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
                        <td className="text-end fw-semibold">{match.home_team}</td>
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
                          {!isHomeSelected && <span className="text-muted">Local</span>}
                        </td>
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
                          {!isDrawSelected && <span className="text-muted">Empate</span>}
                        </td>
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
                          {!isAwaySelected && <span className="text-muted">Visitante</span>}
                        </td>
                        <td className="text-start fw-semibold">{match.away_team}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button type="button" className="btn btn-secondary me-3" onClick={() => setSelectedMatches({})}>
          Limpiar selecciones
        </button>

        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
      )
      }
    </div>
  );
}