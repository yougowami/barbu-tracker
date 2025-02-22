// public.js
document.addEventListener('DOMContentLoaded', function() {
  let cachedData = null;

  // Charge les données depuis Firestore et met en cache le résultat
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

  // Rafraîchit le cache et réaffiche le dashboard
  async function refreshData() {
    cachedData = null;
    await renderDashboard();
    await populateHistoryDropdowns();
  }

  function updateWeeklyStats(data) {
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
      activeSaisons.sort(function(a, b) {
        return new Date(a.endDate) - new Date(b.endDate);
      });
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

      // Classement de la saison
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
      const seasonRanking = Object.entries(seasonScores).sort(function(a, b) {
        return a[1] - b[1];
      });
      const seasonRankingList = document.getElementById('season-ranking-list');
      seasonRankingList.innerHTML = "";
      if (seasonRanking.length === 0) {
        seasonRankingList.innerHTML = "<li>Aucun score disponible</li>";
      } else {
        seasonRanking.forEach(function([player, score], index) {
          let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
          seasonRankingList.innerHTML += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
        });
      }
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

      // Affichage du temps pour la session : si la session est à venir, affiche le temps restant; sinon, le temps écoulé depuis le début
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
      const sessionRankingList = document.getElementById('session-ranking-list');
      sessionRankingList.innerHTML = "";
      if (sessionRanking.length === 0) {
        sessionRankingList.innerHTML = "<li>Aucun score disponible</li>";
      } else {
        sessionRanking.forEach(function([player, score], index) {
          let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
          sessionRankingList.innerHTML += `<li>${emoji} ${index + 1}. ${player}: ${score}</li>`;
        });
      }

      // Résumé de la dernière partie
      const finishedSessionParties = sessionParties.slice();
      finishedSessionParties.sort(function(a, b) {
        const timeA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const timeB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return timeB - timeA;
      });
      const lastParty = finishedSessionParties[0];
      const lastPartyList = document.getElementById('last-party-list');
      lastPartyList.innerHTML = "";
      if (lastParty) {
        Object.entries(lastParty.scores).forEach(function([player, score]) {
          lastPartyList.innerHTML += `<li>${player}: ${score}</li>`;
        });
      } else {
        lastPartyList.innerHTML = "<li>Aucune partie terminée dans cette session</li>";
      }
    } else {
      document.getElementById('session-ranking-list').innerHTML = "<li>Aucune session en cours</li>";
      document.getElementById('last-party-list').innerHTML = "<li>-</li>";
      document.getElementById('session-time').textContent = "";
    }
  }

  function computeAchievements(data) {
    // Pour les succès existants : agrégation, victoires et défaites
    const aggregatedScores = {};
    const defeatCounts = {};
    const winCounts = {};
    // Pour "Le plus constant" et "Le plus amélioré", on collecte tous les scores par joueur
    const playerScores = {};
    // Pour "Le plus surprenant", on calculera l'écart maximal par partie pour chaque joueur
    const playerSurprises = {};
  
    data.parties.forEach(function(party) {
      if (!party.finished) return;
      const scores = party.scores;
  
      // Enregistrement des scores pour chaque joueur
      Object.entries(scores).forEach(function([player, score]) {
        aggregatedScores[player] = (aggregatedScores[player] || 0) + score;
        if (!playerScores[player]) {
          playerScores[player] = [];
        }
        playerScores[player].push({
          score: score,
          time: party.createdAt ? party.createdAt.toDate() : new Date(0)
        });
      });
  
      // Calcul des victoires/défaites sur la partie (meilleur score = victoire, pire score = défaite)
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
  
      // Pour "Le plus surprenant" : calculer l'écart entre le score du joueur et la moyenne de la partie
      const partyScores = Object.values(scores);
      const partyAvg = partyScores.reduce((sum, val) => sum + val, 0) / partyScores.length;
      Object.entries(scores).forEach(function([player, score]) {
        const deviation = Math.abs(score - partyAvg);
        if (!playerSurprises[player] || deviation > playerSurprises[player]) {
          playerSurprises[player] = deviation;
        }
      });
    });
  
    // Succès existants
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
  
    // --- Le plus constant --- 
    // On choisit le joueur dont l'intervalle (max - min) de scores sur les parties terminées est le plus faible
    let mostConsistentPlayer = "-";
    let mostConsistentValue = Infinity;
    Object.entries(playerScores).forEach(function([player, scoreEntries]) {
      if (scoreEntries.length < 2) return; // Nécessite au moins 2 parties
      const scores = scoreEntries.map(entry => entry.score);
      const range = Math.max(...scores) - Math.min(...scores);
      if (range < mostConsistentValue) {
        mostConsistentValue = range;
        mostConsistentPlayer = player;
      }
    });
    if (mostConsistentPlayer === "-") {
      mostConsistentValue = "N/A";
    } else {
      mostConsistentValue = mostConsistentValue.toFixed(2);
    }
  
    // --- Le plus amélioré --- 
    // On calcule la différence entre le premier score et le dernier (ordonnés par le temps) pour chaque joueur
    let biggestImprovementPlayer = "-";
    let biggestImprovementValue = 0;
    Object.entries(playerScores).forEach(function([player, scoreEntries]) {
      if (scoreEntries.length < 2) return;
      scoreEntries.sort((a, b) => a.time - b.time);
      const firstScore = scoreEntries[0].score;
      const lastScore = scoreEntries[scoreEntries.length - 1].score;
      // Comme un score plus bas est meilleur, l'amélioration correspond à la réduction du score
      const improvement = firstScore - lastScore;
      if (improvement > biggestImprovementValue) {
        biggestImprovementValue = improvement;
        biggestImprovementPlayer = player;
      }
    });
    biggestImprovementValue = biggestImprovementPlayer === "-" ? "N/A" : biggestImprovementValue.toFixed(2);
  
    // --- Le plus surprenant --- 
    // Le joueur qui a eu, dans une partie, l'écart maximal par rapport à la moyenne
    let mostSurprisingPlayer = "-";
    let mostSurprisingValue = -Infinity;
    Object.entries(playerSurprises).forEach(function([player, deviation]) {
      if (deviation > mostSurprisingValue) {
        mostSurprisingValue = deviation;
        mostSurprisingPlayer = player;
      }
    });
    mostSurprisingValue = mostSurprisingPlayer === "-" ? "N/A" : mostSurprisingValue.toFixed(2);
  
    // --- Joueur de la semaine ---
    // On réutilise la logique de la section hebdomadaire : parmi les parties terminées durant la semaine, le joueur avec le score cumulé le plus bas gagne.
    const today = new Date();
    const weeklyScores = {};
    data.parties.forEach(function(party) {
      if (!party.finished) return;
      const session = data.sessions.find(function(s) { return s.id === party.sessionId; });
      if (session) {
        const sessionDate = new Date(session.date);
        const diffDays = (today - sessionDate) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 7) {
          Object.entries(party.scores).forEach(function([player, score]) {
            weeklyScores[player] = (weeklyScores[player] || 0) + score;
          });
        }
      }
    });
    let playerOfTheWeek = "-";
    let playerOfTheWeekValue = Infinity;
    Object.entries(weeklyScores).forEach(function([player, score]) {
      if (score < playerOfTheWeekValue) {
        playerOfTheWeekValue = score;
        playerOfTheWeek = player;
      }
    });
    playerOfTheWeekValue = playerOfTheWeek === "-" ? "N/A" : playerOfTheWeekValue;
  
    // Mise à jour des éléments DOM
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

  // Fonction principale pour afficher le dashboard
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

  // Déclaration classique pour s'assurer qu'elle soit dans le scope global
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

  // Initialisation : attache les fonctions globales et lance le dashboard
  function init() {
    window.populateDropdowns = populateDropdowns;
    window.renderDashboard = renderDashboard;
    populateDropdowns();
    renderDashboard();
  }
  init();
});
