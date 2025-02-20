// public.js
document.addEventListener('DOMContentLoaded', function() {
  let cachedData = null;

  // Fonction pour charger les données depuis Firestore et mettre en cache le résultat
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

  // Rafraîchit le cache et re-render le dashboard
  async function refreshData() {
    cachedData = null;
    await renderDashboard();
    await populateHistoryDropdowns();
  }

  // Mise à jour du résumé de la semaine
  function updateWeeklyStats(data) {
    const today = new Date().toISOString().split('T')[0];
    let weeklyParties = [];
    data.parties.forEach(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      if (session) {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        const diffDays = (new Date(today) - new Date(sessionDate)) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 7) {
          weeklyParties.push(party);
        }
      }
    });
    document.getElementById('weekly-summary-count').textContent = weeklyParties.length;

    // Calcul des scores de la semaine
    const weeklyScores = {};
    weeklyParties.forEach(party => {
      Object.entries(party.scores).forEach(([player, score]) => {
        weeklyScores[player] = (weeklyScores[player] || 0) + score;
      });
    });
    let bestPlayer = "-", bestScore = Infinity;
    Object.entries(weeklyScores).forEach(([player, score]) => {
      if (score < bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    });
    document.getElementById('weekly-best-score').textContent = bestScore === Infinity ? "-" : bestScore;
    document.getElementById('weekly-top-player').textContent = bestPlayer;
  }

  // Mise à jour de la saison en cours et de son classement
  function updateSeasonInfo(data) {
    const now = new Date();
    const activeSaisons = data.saisons.filter(season => !season.finished && new Date(season.endDate) >= now);
    if (activeSaisons.length > 0) {
      activeSaisons.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      const currentSeason = activeSaisons[0];
      document.getElementById('season-end').textContent = `Date de fin: ${currentSeason.endDate}`;

      const endDate = new Date(currentSeason.endDate);
      const diffMs = endDate - now;
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('time-remaining').textContent = `Temps restant: ${diffDays} j, ${diffHrs} h, ${diffMins} m`;
      } else {
        document.getElementById('time-remaining').textContent = "La saison est terminée.";
      }

      // Classement de la saison (pour les sessions terminées)
      const seasonSessions = data.sessions.filter(session => session.saisonId === currentSeason.id && session.finished);
      let seasonScores = {};
      seasonSessions.forEach(session => {
        const sessionParties = data.parties.filter(party => party.sessionId === session.id && party.finished);
        sessionParties.forEach(party => {
          Object.entries(party.scores).forEach(([player, score]) => {
            seasonScores[player] = (seasonScores[player] || 0) + score;
          });
        });
      });
      const seasonRanking = Object.entries(seasonScores).sort((a, b) => a[1] - b[1]);
      const seasonRankingList = document.getElementById('season-ranking-list');
      seasonRankingList.innerHTML = "";
      if (seasonRanking.length === 0) {
        seasonRankingList.innerHTML = "<li>Aucun score disponible</li>";
      } else {
        seasonRanking.forEach(([player, score], index) => {
          seasonRankingList.innerHTML += `<li>${index + 1}. ${player}: ${score}</li>`;
        });
      }
    } else {
      document.getElementById('season-end').textContent = "Aucune saison en cours.";
      document.getElementById('time-remaining').textContent = "-";
      document.getElementById('season-ranking-list').innerHTML = "<li>-</li>";
    }
  }

  // Mise à jour de la session en cours, de son classement et du résumé de la dernière partie
  function updateSessionInfo(data) {
    const activeSessions = data.sessions.filter(session => !session.finished);
    if (activeSessions.length > 0) {
      activeSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
      const currentSession = activeSessions[0];

      // Classement de la session
      const sessionParties = data.parties.filter(party => party.sessionId === currentSession.id && party.finished);
      let sessionScores = {};
      sessionParties.forEach(party => {
        Object.entries(party.scores).forEach(([player, score]) => {
          sessionScores[player] = (sessionScores[player] || 0) + score;
        });
      });
      const sessionRanking = Object.entries(sessionScores).sort((a, b) => a[1] - b[1]);
      const sessionRankingList = document.getElementById('session-ranking-list');
      sessionRankingList.innerHTML = "";
      if (sessionRanking.length === 0) {
        sessionRankingList.innerHTML = "<li>Aucun score disponible</li>";
      } else {
        sessionRanking.forEach(([player, score], index) => {
          sessionRankingList.innerHTML += `<li>${index + 1}. ${player}: ${score}</li>`;
        });
      }

      // Résumé de la dernière partie de la session
      const finishedSessionParties = sessionParties.slice();
      finishedSessionParties.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const timeB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return timeB - timeA;
      });
      const lastParty = finishedSessionParties[0];
      const lastPartyList = document.getElementById('last-party-list');
      lastPartyList.innerHTML = "";
      if (lastParty) {
        for (const [player, score] of Object.entries(lastParty.scores)) {
          lastPartyList.innerHTML += `<li>${player}: ${score}</li>`;
        }
      } else {
        lastPartyList.innerHTML = "<li>Aucune partie terminée dans cette session</li>";
      }
    } else {
      document.getElementById('session-ranking-list').innerHTML = "<li>Aucune session en cours</li>";
      document.getElementById('last-party-list').innerHTML = "<li>-</li>";
    }
  }

  // Calcul et affichage des succès (achievements)
  function computeAchievements(data) {
    const aggregatedScores = {};
    const defeatCounts = {};
    const winCounts = {};
    data.parties.forEach(party => {
      if (!party.finished) return;
      const scores = party.scores;
      Object.entries(scores).forEach(([player, score]) => {
        aggregatedScores[player] = (aggregatedScores[player] || 0) + score;
      });
      const players = Object.keys(scores);
      let minScore = Infinity, maxScore = -Infinity;
      players.forEach(player => {
        const s = scores[player];
        if (s < minScore) minScore = s;
        if (s > maxScore) maxScore = s;
      });
      players.forEach(player => {
        if (scores[player] === minScore) {
          winCounts[player] = (winCounts[player] || 0) + 1;
        }
        if (scores[player] === maxScore) {
          defeatCounts[player] = (defeatCounts[player] || 0) + 1;
        }
      });
    });
    let mostPointsPlayer = "-", mostPoints = -Infinity;
    Object.entries(aggregatedScores).forEach(([player, score]) => {
      if (score > mostPoints) {
        mostPoints = score;
        mostPointsPlayer = player;
      }
    });
    let leastPointsPlayer = "-", leastPoints = Infinity;
    Object.entries(aggregatedScores).forEach(([player, score]) => {
      if (score < leastPoints) {
        leastPoints = score;
        leastPointsPlayer = player;
      }
    });
    let mostDefeatsPlayer = "-", mostDefeats = -Infinity;
    Object.entries(defeatCounts).forEach(([player, count]) => {
      if (count > mostDefeats) {
        mostDefeats = count;
        mostDefeatsPlayer = player;
      }
    });
    let mostWinsPlayer = "-", mostWins = -Infinity;
    Object.entries(winCounts).forEach(([player, count]) => {
      if (count > mostWins) {
        mostWins = count;
        mostWinsPlayer = player;
      }
    });
    // Succès supplémentaires (valeurs statiques pour l'exemple)
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

  // Mise à jour du classement général
  function updateGeneralLeaderboard(data) {
    let generalScores = {};
    data.parties.filter(p => p.finished).forEach(party => {
      Object.entries(party.scores).forEach(([player, score]) => {
        generalScores[player] = (generalScores[player] || 0) + score;
      });
    });
    const generalRanking = Object.entries(generalScores).sort((a, b) => a[1] - b[1]);
    let html = "";
    if (generalRanking.length === 0) {
      html = "Aucun score général disponible.";
    } else {
      html = "<ul>";
      generalRanking.forEach(([player, score], index) => {
        html += `<li>${index + 1}. ${player}: ${score}</li>`;
      });
      html += "</ul>";
    }
    document.getElementById('general-leaderboard-list').innerHTML = html;
  }

  // Gestion du formulaire d'historique
  async function populateHistoryDropdowns() {
    const data = await loadData();
    const seasons = data.saisons;
    const historySeason = document.getElementById('historySeason');
    historySeason.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    seasons.forEach(season => {
      historySeason.innerHTML += `<option value="${season.id}">${season.nom}</option>`;
    });
    document.getElementById('historySession').innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    document.getElementById('historyParty').innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
  }

  document.getElementById('historySeason').addEventListener('change', async (e) => {
    const seasonId = e.target.value;
    const data = await loadData();
    const sessions = data.sessions.filter(s => s.saisonId === seasonId);
    const historySession = document.getElementById('historySession');
    historySession.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    sessions.forEach(session => {
      historySession.innerHTML += `<option value="${session.id}">${session.date}</option>`;
    });
    document.getElementById('historyParty').innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
  });

  document.getElementById('historySession').addEventListener('change', async (e) => {
    const sessionId = e.target.value;
    const data = await loadData();
    const parties = data.parties.filter(p => p.sessionId === sessionId);
    const historyParty = document.getElementById('historyParty');
    historyParty.innerHTML = '<option value="">-- Sélectionnez une partie --</option>';
    parties.forEach(party => {
      historyParty.innerHTML += `<option value="${party.id}">${party.id}</option>`;
    });
  });

  document.getElementById('goToResumeBtn').addEventListener('click', () => {
    const seasonId = document.getElementById('historySeason').value;
    const sessionId = document.getElementById('historySession').value;
    const partyId = document.getElementById('historyParty').value;
    let url = "resume.html?";
    if (partyId) {
      url += `type=partie&id=${encodeURIComponent(partyId)}`;
    } else if (sessionId) {
      url += `type=session&id=${encodeURIComponent(sessionId)}`;
    } else if (seasonId) {
      url += `type=saison&id=${encodeURIComponent(seasonId)}`;
    } else {
      alert("Veuillez sélectionner au moins une saison.");
      return;
    }
    window.location.href = url;
  });

  document.getElementById('viewHistoryBtn').addEventListener('click', () => {
    const historyForm = document.getElementById('historyForm');
    historyForm.style.display = (historyForm.style.display === "none" || historyForm.style.display === "") ? "block" : "none";
    if (historyForm.style.display === "block") {
      populateHistoryDropdowns();
    }
  });

  // Fonctions de suppression globales
  window.deleteSeason = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette saison ?")) {
      try {
        await db.collection('saisons').doc(id).delete();
        alert("Saison supprimée.");
        window.populateDropdowns();
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
        window.populateDropdowns();
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

  // Marquer une session comme terminée
  window.markSessionFinished = async function(id) {
    if (confirm("Voulez-vous marquer cette session comme terminée ?")) {
      try {
        await db.collection('sessions').doc(id).update({ finished: true });
        alert("Session marquée comme terminée.");
        window.populateDropdowns();
        renderDashboard();
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la session :", error);
        alert("Erreur lors de la mise à jour.");
      }
    }
  };

  // Fonction principale pour afficher le dashboard
  async function renderDashboard() {
    const data = await loadData();
    updateWeeklyStats(data);
    updateSeasonInfo(data);
    updateSessionInfo(data);
    computeAchievements(data);
    updateGeneralLeaderboard(data);
  }

  // Mise à jour du classement général
  function updateGeneralLeaderboard(data) {
    let generalScores = {};
    data.parties.filter(p => p.finished).forEach(party => {
      Object.entries(party.scores).forEach(([player, score]) => {
        generalScores[player] = (generalScores[player] || 0) + score;
      });
    });
    const generalRanking = Object.entries(generalScores).sort((a, b) => a[1] - b[1]);
    let html = "";
    if (generalRanking.length === 0) {
      html = "Aucun score général disponible.";
    } else {
      html = "<ul>";
      generalRanking.forEach(([player, score], index) => {
        html += `<li>${index + 1}. ${player}: ${score}</li>`;
      });
      html += "</ul>";
    }
    document.getElementById('general-leaderboard-list').innerHTML = html;
  }

  // Initialisation : attache les fonctions globalement et lance le dashboard
  function init() {
    window.populateDropdowns = populateDropdowns;
    window.renderDashboard = renderDashboard;
    populateDropdowns();
    renderDashboard();
  }
  init();
});
