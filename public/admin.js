document.addEventListener('DOMContentLoaded', function() {
  // Vérification de l'état de connexion
  firebase.auth().onAuthStateChanged(function(user) {
    if (user && user.email === "hugo.amistani82000@gmail.com") {
      // Si l'utilisateur est connecté et autorisé, masquer le formulaire de connexion
      document.getElementById('loginContainer').style.display = "none";
      document.getElementById('adminContent').style.display = "block";
      initAdmin();
    } else {
      // Sinon, afficher le formulaire de connexion
      document.getElementById('loginContainer').style.display = "block";
      document.getElementById('adminContent').style.display = "none";
    }
  });

  // Gestion du formulaire de connexion
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function() {
        // onAuthStateChanged gère l'affichage
      })
      .catch(function(error) {
        alert("Erreur de connexion : " + error.message);
      });
  });

  // Fonction d'initialisation du dashboard admin
  function initAdmin() {
    populateDropdowns();
    renderDashboard();
  }

  let cachedData = null;
  async function loadData() {
    if (cachedData) return cachedData;
    try {
      const saisonsSnapshot = await db.collection('saisons').get();
      const sessionsSnapshot = await db.collection('sessions').get();
      const partiesSnapshot = await db.collection('parties').get();

      const saisons = saisonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const parties = partiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      cachedData = { saisons, sessions, parties };
      return cachedData;
    } catch (err) {
      console.error("Erreur lors du chargement des données :", err);
      return { saisons: [], sessions: [], parties: [] };
    }
  }

  async function renderDashboard() {
    const data = await loadData();
    // Mettez ici vos appels pour mettre à jour chaque section du dashboard
    updateWeeklyStats(data);
    updateSeasonInfo(data);
    updateSessionInfo(data);
    computeAchievements(data);
    updateGeneralLeaderboard(data);
  }

  function updateWeeklyStats(data) {
    // Exemple simplifié : nombre de parties cette semaine, meilleur score et top joueur
    const today = new Date().toISOString().split('T')[0];
    let weeklyParties = [];
    data.parties.forEach(function(party) {
      const session = data.sessions.find(function(s) { return s.id === party.sessionId; });
      if (session) {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        const diffDays = (new Date(today) - new Date(sessionDate)) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 7) {
          weeklyParties.push(party);
        }
      }
    });
    document.getElementById('weekly-summary-count').textContent = weeklyParties.length;
    const weeklyScores = {};
    weeklyParties.forEach(function(party) {
      Object.entries(party.scores).forEach(function([player, score]) {
        weeklyScores[player] = (weeklyScores[player] || 0) + score;
      });
    });
    let bestPlayer = "-", bestScore = Infinity;
    Object.entries(weeklyScores).forEach(function([player, score]) {
      if (score < bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    });
    document.getElementById('weekly-best-score').textContent = bestScore === Infinity ? "-" : bestScore;
    document.getElementById('weekly-top-player').textContent = bestPlayer;
  }

  function updateSeasonInfo(data) {
    const now = new Date();
    const activeSaisons = data.saisons.filter(function(season) {
      return !season.finished && new Date(season.endDate) >= now;
    });
    if (activeSaisons.length > 0) {
      activeSaisons.sort(function(a, b) { return new Date(a.endDate) - new Date(b.endDate); });
      const currentSeason = activeSaisons[0];
      document.getElementById('season-end').textContent = "Date de fin: " + currentSeason.endDate;
      const endDate = new Date(currentSeason.endDate);
      const diffMs = endDate - now;
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('time-remaining').textContent = "Temps restant: " + diffDays + " j, " + diffHrs + " h, " + diffMins + " m";
      } else {
        document.getElementById('time-remaining').textContent = "La saison est terminée.";
      }
      // Calcul du classement de la saison (sur les sessions terminées)
      const seasonSessions = data.sessions.filter(function(session) {
        return session.saisonId === currentSeason.id && session.finished;
      });
      let seasonScores = {};
      seasonSessions.forEach(function(session) {
        const sessionParties = data.parties.filter(function(party) {
          return party.sessionId === session.id && party.finished;
        });
        sessionParties.forEach(function(party) {
          Object.entries(party.scores).forEach(function([player, score]) {
            seasonScores[player] = (seasonScores[player] || 0) + score;
          });
        });
      });
      const seasonRanking = Object.entries(seasonScores).sort(function(a, b) { return a[1] - b[1]; });
      let rankingHtml = "";
      if (seasonRanking.length === 0) {
        rankingHtml = "<li>Aucun score disponible</li>";
      } else {
        seasonRanking.forEach(function([player, score], index) {
          let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
          rankingHtml += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
        });
      }
      document.getElementById('season-ranking-list').innerHTML = rankingHtml;
    } else {
      document.getElementById('season-end').textContent = "Aucune saison en cours.";
      document.getElementById('time-remaining').textContent = "-";
      document.getElementById('season-ranking-list').innerHTML = "<li>-</li>";
    }
  }

  function updateSessionInfo(data) {
    const activeSessions = data.sessions.filter(function(session) { return !session.finished; });
    if (activeSessions.length > 0) {
      activeSessions.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
      const currentSession = activeSessions[0];

      // Affichage du temps pour la session
      const sessionTimeElem = document.getElementById('session-time');
      const sessionStart = new Date(currentSession.date);
      const now = new Date();
      if (sessionStart > now) {
        const diffMs = sessionStart - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        sessionTimeElem.textContent = "Session à venir dans : " + diffDays + " j, " + diffHrs + " h, " + diffMins + " m";
      } else {
        const diffMs = now - sessionStart;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        sessionTimeElem.textContent = "Session en cours depuis : " + diffHrs + " h, " + diffMins + " m";
      }
      // Classement de la session
      const sessionParties = data.parties.filter(function(party) {
        return party.sessionId === currentSession.id && party.finished;
      });
      let sessionScores = {};
      sessionParties.forEach(function(party) {
        Object.entries(party.scores).forEach(function([player, score]) {
          sessionScores[player] = (sessionScores[player] || 0) + score;
        });
      });
      const sessionRanking = Object.entries(sessionScores).sort(function(a, b) { return a[1] - b[1]; });
      let rankingHtml = "";
      if (sessionRanking.length === 0) {
        rankingHtml = "<li>Aucun score disponible</li>";
      } else {
        sessionRanking.forEach(function([player, score], index) {
          let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
          rankingHtml += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
        });
      }
      document.getElementById('session-ranking-list').innerHTML = rankingHtml;

      // Résumé de la dernière partie
      const finishedSessionParties = sessionParties.slice();
      finishedSessionParties.sort(function(a, b) {
        const timeA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const timeB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return timeB - timeA;
      });
      const lastParty = finishedSessionParties[0];
      let lastPartyHtml = "";
      if (lastParty) {
        Object.entries(lastParty.scores).forEach(function([player, score]) {
          lastPartyHtml += `<li>${player}: ${score}</li>`;
        });
      } else {
        lastPartyHtml = "<li>Aucune partie terminée dans cette session</li>";
      }
      document.getElementById('last-party-list').innerHTML = lastPartyHtml;
    } else {
      document.getElementById('session-ranking-list').innerHTML = "<li>Aucune session en cours</li>";
      document.getElementById('last-party-list').innerHTML = "<li>-</li>";
      document.getElementById('session-time').textContent = "";
    }
  }

  function computeAchievements(data) {
    const aggregatedScores = {};
    const defeatCounts = {};
    const winCounts = {};
    data.parties.forEach(function(party) {
      if (!party.finished) return;
      const scores = party.scores;
      Object.entries(scores).forEach(function([player, score]) {
        aggregatedScores[player] = (aggregatedScores[player] || 0) + score;
      });
      const players = Object.keys(scores);
      let minScore = Infinity, maxScore = -Infinity;
      players.forEach(function(player) {
        const s = scores[player];
        if (s < minScore) minScore = s;
        if (s > maxScore) maxScore = s;
      });
      players.forEach(function(player) {
        if (scores[player] === minScore) {
          winCounts[player] = (winCounts[player] || 0) + 1;
        }
        if (scores[player] === maxScore) {
          defeatCounts[player] = (defeatCounts[player] || 0) + 1;
        }
      });
    });
    let mostPointsPlayer = "-", mostPoints = -Infinity;
    Object.entries(aggregatedScores).forEach(function([player, score]) {
      if (score > mostPoints) {
        mostPoints = score;
        mostPointsPlayer = player;
      }
    });
    let leastPointsPlayer = "-", leastPoints = Infinity;
    Object.entries(aggregatedScores).forEach(function([player, score]) {
      if (score < leastPoints) {
        leastPoints = score;
        leastPointsPlayer = player;
      }
    });
    let mostDefeatsPlayer = "-", mostDefeats = -Infinity;
    Object.entries(defeatCounts).forEach(function([player, count]) {
      if (count > mostDefeats) {
        mostDefeats = count;
        mostDefeatsPlayer = player;
      }
    });
    let mostWinsPlayer = "-", mostWins = -Infinity;
    Object.entries(winCounts).forEach(function([player, count]) {
      if (count > mostWins) {
        mostWins = count;
        mostWinsPlayer = player;
      }
    });
    // Succès supplémentaires (exemple statique)
    let mostConsistentPlayer = "N/A", mostConsistentValue = "N/A";
    let biggestImprovementPlayer = "N/A", biggestImprovementValue = "N/A";
    let mostSurprisingPlayer = "N/A", mostSurprisingValue = "N/A";
    let playerOfTheWeek = "N/A", playerOfTheWeekValue = "N/A";

    document.getElementById('mostPoints').innerHTML = `<i class="fas fa-crown"></i><p>Plus de points: ${mostPointsPlayer} (${mostPoints})</p>`;
    document.getElementById('leastPoints').innerHTML = `<i class="fas fa-medal"></i><p>Moins de points: ${leastPointsPlayer} (${leastPoints})</p>`;
    document.getElementById('mostDefeats').innerHTML = `<i class="fas fa-skull-crossbones"></i><p>Plus de défaites: ${mostDefeatsPlayer} (${mostDefeats})</p>`;
    document.getElementById('mostWins').innerHTML = `<i class="fas fa-trophy"></i><p>Plus de victoires: ${mostWinsPlayer} (${mostWins})</p>`;
    document.getElementById('mostConsistent').innerHTML = `<i class="fas fa-sync-alt"></i><p>Le plus constant: ${mostConsistentPlayer} (${mostConsistentValue})</p>`;
    document.getElementById('biggestImprovement').innerHTML = `<i class="fas fa-arrow-up"></i><p>Le plus amélioré: ${biggestImprovementPlayer} (${biggestImprovementValue})</p>`;
    document.getElementById('mostSurprising').innerHTML = `<i class="fas fa-bolt"></i><p>Le plus surprenant: ${mostSurprisingPlayer} (${mostSurprisingValue})</p>`;
    document.getElementById('playerOfTheWeek').innerHTML = `<i class="fas fa-star"></i><p>Joueur de la semaine: ${playerOfTheWeek} (${playerOfTheWeekValue})</p>`;
  }

  function updateGeneralLeaderboard(data) {
    let generalScores = {};
    data.parties.filter(function(p) { return p.finished; }).forEach(function(party) {
      Object.entries(party.scores).forEach(function([player, score]) {
        generalScores[player] = (generalScores[player] || 0) + score;
      });
    });
    const generalRanking = Object.entries(generalScores).sort(function(a, b) {
      return a[1] - b[1];
    });
    let html = "";
    if (generalRanking.length === 0) {
      html = "Aucun score général disponible.";
    } else {
      html = "<ul>";
      generalRanking.forEach(function([player, score], index) {
        let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
        html += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
      });
      html += "</ul>";
    }
    document.getElementById('general-leaderboard-list').innerHTML = html;
  }

  async function populateHistoryDropdowns() {
    const data = await loadData();
    const historySeason = document.getElementById('historySeason');
    historySeason.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    data.saisons.forEach(function(season) {
      historySeason.innerHTML += `<option value="${season.id}">${season.nom}</option>`;
    });
    document.getElementById('historySession').innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    document.getElementById('historyParty').innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
  }

  document.getElementById('historySeason').addEventListener('change', async function(e) {
    const seasonId = e.target.value;
    const data = await loadData();
    const sessions = data.sessions.filter(function(s) { return s.saisonId === seasonId; });
    const historySession = document.getElementById('historySession');
    historySession.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    sessions.forEach(function(session) {
      historySession.innerHTML += `<option value="${session.id}">${session.date}</option>`;
    });
    document.getElementById('historyParty').innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
  });

  document.getElementById('historySession').addEventListener('change', async function(e) {
    const sessionId = e.target.value;
    const data = await loadData();
    const parties = data.parties.filter(function(p) { return p.sessionId === sessionId; });
    const historyParty = document.getElementById('historyParty');
    historyParty.innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
    parties.forEach(function(party) {
      historyParty.innerHTML += `<option value="${party.id}">${party.id}</option>`;
    });
  });

  document.getElementById('goToResumeBtn').addEventListener('click', function() {
    const seasonId = document.getElementById('historySeason').value;
    const sessionId = document.getElementById('historySession').value;
    const partyId = document.getElementById('historyParty').value;
    let url = "resume.html?";
    if (partyId) {
      url += "type=partie&id=" + encodeURIComponent(partyId);
    } else if (sessionId) {
      url += "type=session&id=" + encodeURIComponent(sessionId);
    } else if (seasonId) {
      url += "type=saison&id=" + encodeURIComponent(seasonId);
    } else {
      alert("Veuillez sélectionner au moins une saison.");
      return;
    }
    window.location.href = url;
  });

  document.getElementById('viewHistoryBtn').addEventListener('click', function() {
    const historyForm = document.getElementById('historyForm');
    if (historyForm.style.display === "none" || historyForm.style.display === "") {
      historyForm.style.display = "block";
      populateHistoryDropdowns();
    } else {
      historyForm.style.display = "none";
    }
  });

  // Fonctions globales de suppression et mise à jour
  window.deleteSeason = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette saison ?")) {
      try {
        await db.collection('saisons').doc(id).delete();
        alert("Saison supprimée.");
        populateDropdowns();
        renderDashboard();
      } catch (error) {
        console.error("Erreur lors de la suppression de la saison :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  window.deleteSession = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette session ?")) {
      try {
        await db.collection('sessions').doc(id).delete();
        alert("Session supprimée.");
        populateDropdowns();
        renderDashboard();
      } catch (error) {
        console.error("Erreur lors de la suppression de la session :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  window.deleteParty = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette partie ?")) {
      try {
        await db.collection('parties').doc(id).delete();
        alert("Partie supprimée.");
        renderDashboard();
      } catch (error) {
        console.error("Erreur lors de la suppression de la partie :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  window.markSessionFinished = async function(id) {
    if (confirm("Voulez-vous marquer cette session comme terminée ?")) {
      try {
        await db.collection('sessions').doc(id).update({ finished: true });
        alert("Session marquée comme terminée.");
        populateDropdowns();
        renderDashboard();
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la session :", error);
        alert("Erreur lors de la mise à jour.");
      }
    }
  };

  async function renderDashboard() {
    const data = await loadData();
    updateWeeklyStats(data);
    updateSeasonInfo(data);
    updateSessionInfo(data);
    computeAchievements(data);
    updateGeneralLeaderboard(data);
  }

  function updateGeneralLeaderboard(data) {
    let generalScores = {};
    data.parties.filter(function(p) { return p.finished; }).forEach(function(party) {
      Object.entries(party.scores).forEach(function([player, score]) {
        generalScores[player] = (generalScores[player] || 0) + score;
      });
    });
    const generalRanking = Object.entries(generalScores).sort(function(a, b) {
      return a[1] - b[1];
    });
    let html = "";
    if (generalRanking.length === 0) {
      html = "Aucun score général disponible.";
    } else {
      html = "<ul>";
      generalRanking.forEach(function([player, score], index) {
        let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
        html += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
      });
      html += "</ul>";
    }
    document.getElementById('general-leaderboard-list').innerHTML = html;
  }

  // Déclaration classique pour que populateDropdowns soit dans le scope global
  async function populateDropdowns() {
    const data = await loadData();
    const seasons = data.saisons;
    const activeSeasons = seasons.filter(function(season) { return !season.finished; });
    const seasonSelect = document.getElementById('sessionSeason');
    seasonSelect.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    activeSeasons.forEach(function(season) {
      seasonSelect.innerHTML += `<option value="${season.id}">${season.nom}</option>`;
    });
    const sessions = data.sessions.filter(function(session) {
      return activeSeasons.some(function(season) { return season.id === session.saisonId; }) && !session.finished;
    });
    const sessionSelect = document.getElementById('partySession');
    sessionSelect.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    sessions.forEach(function(session) {
      sessionSelect.innerHTML += `<option value="${session.id}">${session.date}</option>`;
    });
  }

  function init() {
    window.populateDropdowns = populateDropdowns;
    window.renderDashboard = renderDashboard;
    populateDropdowns();
    renderDashboard();
  }
  init();
});
