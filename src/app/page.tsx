'use client'
import styles from "./page.module.css";
import { useState } from "react";
import { soccerTeams, jornadas } from "../utils/resources";

export default function Home() {

  const [selectedMatches, setSelectedMatches] = useState<{ [key: number]: string }>({});
  const [name, setName] = useState<string>("");

  const initialSelectedMatches: { [key: number]: string } = {};
  jornadas[0].matches.forEach((match) => {
    initialSelectedMatches[match.match_id] = "";
  });

  const sendDataToWhatsapp = () => {
    let message = `Quiniela de ${name}\n\n`;

    jornadas[0].matches.forEach((match) => {
      const result = selectedMatches[match.match_id] || "No seleccionado";
      message += `Partido ${match.match_id}: ${result}\n`;
    });
    const whatsappUrl = `https://wa.me/5575209743?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  }

  return (
    <div className={`${styles.page} text-center mt-5`}>
      <h1>Quiniela</h1>
      <p>{jornadas[0].name}</p>

      <form onSubmit={(e) => {
        e.preventDefault();
        sendDataToWhatsapp();
      }}>

        <label htmlFor="name" className="mb-3">
          Nombre:
          <input id="name" type="text" onChange={e => setName(e.target.value)} required/>
        </label>

        {jornadas[0].matches.map((match) => (
          <div key={match.match_id} className="d-flex justify-content-center align-items-center mb-3">

            <div className="d-flex gap-3 mx-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`match-${match.match_id}`}
                  id={`home-win-${match.match_id}`}
                  value={`gana_local_${soccerTeams.find(team => team.id === match.home_team_id)?.name || "Unknown Team"}`}
                  checked={selectedMatches[match.match_id] === `gana_local_${soccerTeams.find(team => team.id === match.home_team_id)?.name || "Unknown Team"}`}
                  onChange={(e) =>
                    setSelectedMatches({
                      ...selectedMatches,
                      [match.match_id]: e.target.value,
                    })
                  }
                  required
                />
                <label className="form-check-label" htmlFor={`home-win-${match.match_id}`}>
                  Gana Local
                </label>
              </div>

              <div className="me-3">
                {soccerTeams.find(team => team.id === match.home_team_id)?.name || "Unknown Team"}
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`match-${match.match_id}`}
                  id={`draw-${match.match_id}`}
                  value="empate"
                  checked={selectedMatches[match.match_id] === "empate"}
                  onChange={(e) =>
                    setSelectedMatches({
                      ...selectedMatches,
                      [match.match_id]: e.target.value,
                    })
                  }
                  required
                />
                <label className="form-check-label" htmlFor={`draw-${match.match_id}`}>
                  Empate
                </label>
              </div>

              <div className="ms-3">
                {soccerTeams.find(team => team.id === match.away_team_id)?.name || "Unknown Team"}
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`match-${match.match_id}`}
                  id={`away-win-${match.match_id}`}
                  value={`gana_visitante_${soccerTeams.find(team => team.id === match.away_team_id)?.name || "Unknown Team"}`}
                  checked={selectedMatches[match.match_id] === `gana_visitante_${soccerTeams.find(team => team.id === match.away_team_id)?.name || "Unknown Team"}`}
                  onChange={(e) =>
                    setSelectedMatches({
                      ...selectedMatches,
                      [match.match_id]: e.target.value,
                    })
                  }
                  required
                />
                <label className="form-check-label" htmlFor={`away-win-${match.match_id}`}>
                  Gana visitante
                </label>
              </div>
            </div>

          </div>
        ))}

        <button type="button" className="btn btn-secondary me-3" onClick={() => setSelectedMatches(initialSelectedMatches)}>
          Limpiar selecciones
        </button>

        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>

    </div>
  );
}