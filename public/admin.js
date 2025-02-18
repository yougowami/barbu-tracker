document.addEventListener('DOMContentLoaded', () => {
  const players = ["Hugo", "Léo", "Guillaume", "Gabriel"];
  let data = { saisons: [], sessions: [], parties: [] };

  // --- Chargement automatique du fichier data.json ---
  async function loadData() {
    try {
      const response = await fetch('data.json');
      if (!response.ok) throw new Error('Erreur lors du chargement de data.json');
      data = await response.json();
      saveToLocal();
      renderAll();
      document.getElementById("file-status").textContent = "Données chargées depuis data.json";
    } catch (err) {
      console.error("Erreur lors du chargement de data.json:", err);
      alert("Erreur lors du chargement de data.json. Les données seront initialisées à vide.");
      data = { saisons: [], sessions: [], parties: [] };
      renderAll();
      document.getElementById("file-status").textContent = "Erreur de chargement de data.json";
    }
  }

  // --- Stockage local ---
  function saveToLocal() {
    localStorage.setItem('barbuData', JSON.stringify(data));
  }
  function loadFromLocal() {
    const stored = localStorage.getItem('barbuData');
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (e) {
        console.error("Erreur de parsing des données locales", e);
        data = { saisons: [], sessions: [], parties: [] };
      }
    }
  }

  // --- Exportation des données ---
  function exportData() {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  document.getElementById("exportButton").addEventListener("click", exportData);

  // --- Navigation par onglets ---
  const tabs = document.querySelectorAll('.tabs li');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelector('.tabs li.active').classList.remove('active');
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
      });
      document.getElementById(target).classList.remove('hidden');
      if (target === 'scores') {
        renderCurrentSessionSelect();
        renderScoresForSession(document.getElementById('current-session-select').value);
      }
      if (target === 'classement') {
        renderRanking();
      }
      if (target === 'historique') {
        renderHistorique();
      }
    });
  });

  // --- Rendu de l'interface ---

  // Affichage des saisons triées par ordre décroissant (les plus récentes en haut)
  function renderSaisons() {
    const container = document.getElementById('saisons-list');
    container.innerHTML = "";
    const sortedSaisons = [...data.saisons].sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
    sortedSaisons.forEach(saison => {
      const div = document.createElement('div');
      div.className = 'item saison ' + (saison.finished ? 'finished' : 'in-progress');
      div.innerHTML = `<span class="saison-name">${saison.nom}</span> ${saison.finished ? '✅' : '⌛'}`;
      if (!saison.finished) {
        const btnFinish = document.createElement('button');
        btnFinish.textContent = "Terminer";
        btnFinish.addEventListener('click', () => {
          saison.finished = true;
          saveToLocal();
          renderSaisons();
          renderHistorique();
        });
        div.appendChild(btnFinish);
      }
      container.appendChild(div);
    });
  }

  // Affichage des sessions triées par date décroissante
  function renderSessions() {
    const container = document.getElementById('sessions-list');
    container.innerHTML = "";
    const sortedSessions = [...data.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedSessions.forEach(session => {
      const saison = data.saisons.find(s => s.id === session.saisonId);
      const div = document.createElement('div');
      div.className = 'item session ' + (session.finished ? 'finished' : 'in-progress');
      div.innerHTML = `<span class="session-date">Session du ${session.date}</span> ${session.finished ? '✅' : '⌛'} ${saison ? ' ('+saison.nom+')' : ''}`;
      if (!session.finished) {
        const btnFinish = document.createElement('button');
        btnFinish.textContent = "Terminer";
        btnFinish.addEventListener('click', () => {
          session.finished = true;
          saveToLocal();
          renderSessions();
          renderHistorique();
        });
        div.appendChild(btnFinish);
      }
      container.appendChild(div);
    });
  }

  // Affichage des parties triées par date décroissante (basé sur l'id)
  function renderParties() {
    const container = document.getElementById('parties-list');
    container.innerHTML = "";
    const sortedParties = [...data.parties].sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
    sortedParties.forEach(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      const div = document.createElement('div');
      div.className = 'item party ' + (party.finished ? 'finished' : 'in-progress');
      div.innerHTML = `<span class="party-name">Partie${session ? " du " + session.date : ""}</span> ${party.finished ? '✅' : '⌛'}`;
      if (!party.finished) {
        const btnFinish = document.createElement('button');
        btnFinish.textContent = "Terminer manuellement";
        btnFinish.addEventListener('click', () => {
          party.finished = true;
          saveToLocal();
          renderParties();
          renderHistorique();
        });
        div.appendChild(btnFinish);
      }
      container.appendChild(div);
    });
  }

  // Onglet Scores : afficher uniquement les parties non terminées de la session active
  function renderCurrentSessionSelect() {
    const select = document.getElementById('current-session-select');
    select.innerHTML = '<option value="">Sélectionnez une session</option>';
    data.sessions.filter(s => !s.finished).sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(session => {
        const opt = document.createElement('option');
        opt.value = session.id;
        opt.textContent = session.date;
        select.appendChild(opt);
      });
    select.onchange = () => renderScoresForSession(select.value);
  }

  function renderScoresForSession(sessionId) {
    const container = document.getElementById('scores-list');
    container.innerHTML = "";
    if (!sessionId) return;
    const parties = data.parties.filter(p => p.sessionId === sessionId && !p.finished)
      .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
    parties.forEach(party => {
      const div = document.createElement('div');
      div.className = 'item party ' + (party.finished ? 'finished' : 'in-progress');
      div.innerHTML = `<span class="party-name">Partie</span>`;
      players.forEach(player => {
        const label = document.createElement('label');
        label.textContent = player + ": ";
        const input = document.createElement('input');
        input.type = "number";
        input.id = `score-${party.id}-${player}`;
        input.value = party.scores[player] !== null ? party.scores[player] : "";
        label.appendChild(input);
        div.appendChild(label);
        div.appendChild(document.createElement("br"));
      });
      const btn = document.createElement('button');
      btn.textContent = "Enregistrer scores";
      btn.addEventListener('click', () => {
        players.forEach(player => {
          const inputField = document.getElementById(`score-${party.id}-${player}`);
          const valStr = inputField.value.trim();
          const val = parseInt(valStr, 10);
          party.scores[player] = valStr === "" ? null : (isNaN(val) ? 0 : val);
        });
        // Si tous les scores ont été saisis, on termine la partie automatiquement
        const allScoresEntered = players.every(player => {
          const inputField = document.getElementById(`score-${party.id}-${player}`);
          return inputField.value.trim() !== "";
        });
        if (allScoresEntered) {
          party.finished = true;
          alert("Tous les scores ont été saisis. Partie terminée automatiquement !");
        } else {
          alert("Scores enregistrés pour la partie. (La partie n'est pas encore terminée car tous les scores ne sont pas saisis)");
        }
        saveToLocal();
        renderScoresForSession(sessionId);
        renderParties();
        renderRanking();
        renderHistorique();
      });
      div.appendChild(btn);
      container.appendChild(div);
    });
  }

  // Calcul du classement (seulement global et par saison)
  function computeRanking() {
    const overall = { "Hugo": 0, "Léo": 0, "Guillaume": 0, "Gabriel": 0 };
    data.parties.filter(p => p.finished).forEach(party => {
      players.forEach(player => {
        overall[player] += party.scores[player] || 0;
      });
    });
    const rankingSaisons = data.saisons.map(saison => {
      const totals = { "Hugo": 0, "Léo": 0, "Guillaume": 0, "Gabriel": 0 };
      const sessions = data.sessions.filter(s => s.saisonId === saison.id);
      sessions.forEach(session => {
        data.parties.filter(p => p.sessionId === session.id && p.finished).forEach(party => {
          players.forEach(player => {
            totals[player] += party.scores[player] || 0;
          });
        });
      });
      return { saison: saison.nom, totals };
    });
    return { overall, saisons: rankingSaisons };
  }

  // Affichage du classement global et par saison
  function renderRanking() {
    const ranking = computeRanking();
    const overallDiv = document.getElementById('classement-overall');
    overallDiv.innerHTML = `<h3>Classement Général</h3>
      <table>
        <thead><tr><th>Joueur</th><th>Score</th></tr></thead>
        <tbody>
          ${Object.entries(ranking.overall).map(([player, score]) => `<tr><td>${player}</td><td>${score}</td></tr>`).join('')}
        </tbody>
      </table>`;
    
    const saisonsDiv = document.getElementById('classement-saisons');
    saisonsDiv.innerHTML = `<h3>Classement par Saison</h3>
      ${ranking.saisons.map(r => `
        <div class="ranking-section">
          <h4>${r.saison}</h4>
          <table>
            <thead><tr><th>Joueur</th><th>Score</th></tr></thead>
            <tbody>
              ${Object.entries(r.totals).map(([player, score]) => `<tr><td>${player}</td><td>${score}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}`;
  }

  // Historique des sessions et parties terminées (triés de façon décroissante)
  function renderHistorique() {
    const histSessions = document.getElementById('historique-sessions');
    histSessions.innerHTML = "";
    const finishedSessions = data.sessions.filter(s => s.finished).sort((a, b) => new Date(b.date) - new Date(a.date));
    finishedSessions.forEach(session => {
      const div = document.createElement('div');
      div.className = 'item session finished';
      div.textContent = `Session du ${session.date}`;
      histSessions.appendChild(div);
    });
    const histParties = document.getElementById('historique-parties');
    histParties.innerHTML = "";
    const finishedParties = data.parties.filter(p => p.finished).sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
    finishedParties.forEach(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      const div = document.createElement('div');
      div.className = 'item party finished';
      div.textContent = `Partie${session ? " du " + session.date : ""}`;
      histParties.appendChild(div);
    });
  }

  // Remplissage des formulaires de sélection
  function renderSelectForms() {
    const saisonSelect = document.getElementById('saison-select');
    saisonSelect.innerHTML = '<option value="">Sélectionnez une saison</option>';
    data.saisons.filter(s => !s.finished).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nom;
      saisonSelect.appendChild(opt);
    });
    const sessionSelect = document.getElementById('select-session');
    sessionSelect.innerHTML = '<option value="">Sélectionnez une session</option>';
    data.sessions.filter(sess => !sess.finished)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(sess => {
        const opt = document.createElement('option');
        opt.value = sess.id;
        opt.textContent = sess.date;
        sessionSelect.appendChild(opt);
      });
  }

  function renderAll() {
    renderSaisons();
    renderSessions();
    renderParties();
    renderSelectForms();
    renderCurrentSessionSelect();
    const currentSession = document.getElementById('current-session-select').value;
    renderScoresForSession(currentSession);
    renderRanking();
    renderHistorique();
  }

  // --- Formulaires ---

  document.getElementById('form-saison').addEventListener('submit', (e) => {
    e.preventDefault();
    const nom = document.getElementById('saison-nom').value.trim();
    if (nom) {
      const newSaison = { id: "s" + Date.now(), nom, finished: false, sessions: [] };
      data.saisons.push(newSaison);
      saveToLocal();
      document.getElementById('saison-nom').value = "";
      alert("Saison ajoutée : " + newSaison.nom);
      renderAll();
    }
  });
  
  document.getElementById('form-session').addEventListener('submit', (e) => {
    e.preventDefault();
    const saisonId = document.getElementById('saison-select').value;
    const date = document.getElementById('session-date').value;
    if (saisonId && date) {
      const newSession = { id: "sess" + Date.now(), saisonId, date, finished: false, parties: [] };
      data.sessions.push(newSession);
      const saison = data.saisons.find(s => s.id === saisonId);
      if (saison) saison.sessions.push(newSession.id);
      saveToLocal();
      document.getElementById('session-date').value = "";
      alert("Session ajoutée : " + newSession.date);
      renderAll();
    }
  });
  
  document.getElementById('form-partie').addEventListener('submit', (e) => {
    e.preventDefault();
    const sessionId = document.getElementById('select-session').value;
    if (sessionId) {
      const newPartie = { 
        id: "p" + Date.now(), 
        sessionId, 
        scores: { "Hugo": null, "Léo": null, "Guillaume": null, "Gabriel": null },
        finished: false 
      };
      data.parties.push(newPartie);
      const session = data.sessions.find(s => s.id === sessionId);
      if (session) session.parties.push(newPartie.id);
      saveToLocal();
      alert("Partie ajoutée pour la session du " + (session ? session.date : ""));
      renderAll();
    }
  });
  
  document.getElementById('btn-refresh-ranking').addEventListener('click', renderRanking);
  
  // --- Initialisation ---
  loadFromLocal();
  loadData();
});
