// public.js
document.addEventListener('DOMContentLoaded', () => {
  
  // Charge les données depuis Firestore
  async function loadData() {
    try {
      const saisonsSnapshot = await db.collection('saisons').get();
      const sessionsSnapshot = await db.collection('sessions').get();
      const partiesSnapshot = await db.collection('parties').get();
      
      const saisons = saisonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const parties = partiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return { saisons, sessions, parties };
    } catch (err) {
      console.error("Erreur de chargement des données :", err);
      return { saisons: [], sessions: [], parties: [] };
    }
  }
  
  // Met à jour les statistiques quotidiennes et hebdomadaires
  function updateDailyWeeklyStats(data) {
    const today = new Date().toISOString().split('T')[0];
    let todayParties = [];
    data.parties.forEach(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      if (session) {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        if (sessionDate === today) todayParties.push(party);
      }
    });
    document.getElementById('parties-today').textContent = todayParties.length;
    
    const dailyScores = {};
    todayParties.forEach(party => {
      Object.entries(party.scores).forEach(([player, score]) => {
        dailyScores[player] = (dailyScores[player] || 0) + score;
      });
    });
    let bestPlayer = "-", bestScore = Infinity;
    Object.entries(dailyScores).forEach(([player, score]) => {
      if (score < bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    });
    document.getElementById('best-score').textContent = bestScore === Infinity ? "-" : bestScore;
    document.getElementById('top-player-today').textContent = bestPlayer;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyParties = data.parties.filter(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      return session && new Date(session.date) >= weekAgo;
    });
    document.getElementById('weekly-summary').textContent = `${weeklyParties.length}`;
  }
  
  // Met à jour les informations de la saison en cours (date de fin et temps restant)
  function updateSeasonInfo(data) {
    const now = new Date();
    const currentSeasons = data.saisons.filter(season => !season.finished && new Date(season.endDate) >= now);
    if (currentSeasons.length > 0) {
      currentSeasons.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      const currentSeason = currentSeasons[0];
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
    } else {
      document.getElementById('season-end').textContent = "Aucune saison en cours.";
      document.getElementById('time-remaining').textContent = "-";
    }
  }
  
  // Calcule les succès globaux (achievements)
  function computeAchievements(data) {
    const aggregatedScores = {};
    const defeatCounts = {};
    const winCounts = {};
    
    data.parties.forEach(party => {
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
    
    document.getElementById('mostPoints').innerHTML = `<p>Le joueur avec le plus de points: ${mostPointsPlayer} (${mostPoints})</p>`;
    document.getElementById('leastPoints').innerHTML = `<p>Le joueur avec le moins de points: ${leastPointsPlayer} (${leastPoints})</p>`;
    document.getElementById('mostDefeats').innerHTML = `<p>Le joueur avec le plus de défaites: ${mostDefeatsPlayer} (${mostDefeats})</p>`;
    document.getElementById('mostWins').innerHTML = `<p>Le joueur ayant le plus de victoires: ${mostWinsPlayer} (${mostWins})</p>`;
  }
  
  // Met à jour le leaderboard de la saison et général
  function updateLeaderboards(data) {
    const now = new Date();
    // Leaderboard de la saison en cours
    const currentSeasons = data.saisons.filter(season => !season.finished && new Date(season.endDate) >= now);
    let seasonLeaderboardHTML = "";
    if (currentSeasons.length > 0) {
      currentSeasons.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      const currentSeason = currentSeasons[0];
      const seasonSessions = data.sessions.filter(session => session.saisonId === currentSeason.id);
      let seasonScores = {};
      seasonSessions.forEach(session => {
        const sessionParties = data.parties.filter(party => party.sessionId === session.id && party.finished);
        sessionParties.forEach(party => {
          Object.entries(party.scores).forEach(([player, score]) => {
            seasonScores[player] = (seasonScores[player] || 0) + score;
          });
        });
      });
      const seasonRanking = Object.entries(seasonScores).sort((a, b) => a[1] - b[1]); // moins de points = meilleur
      if (seasonRanking.length === 0) {
        seasonLeaderboardHTML = "Aucun score disponible pour la saison en cours.";
      } else {
        seasonLeaderboardHTML = "<ul>";
        seasonRanking.forEach(([player, score], index) => {
          seasonLeaderboardHTML += `<li>${index+1}. ${player}: ${score}</li>`;
        });
        seasonLeaderboardHTML += "</ul>";
      }
      document.getElementById('season-leaderboard-content').innerHTML = seasonLeaderboardHTML;
    } else {
      document.getElementById('season-leaderboard-content').textContent = "Aucune saison en cours.";
    }
    
    // Leaderboard général (toutes parties terminées)
    let generalScores = {};
    data.parties.filter(p => p.finished).forEach(party => {
      Object.entries(party.scores).forEach(([player, score]) => {
        generalScores[player] = (generalScores[player] || 0) + score;
      });
    });
    const generalRanking = Object.entries(generalScores).sort((a, b) => a[1] - b[1]);
    let generalLeaderboardHTML = "";
    if (generalRanking.length === 0) {
      generalLeaderboardHTML = "Aucun score général disponible.";
    } else {
      generalLeaderboardHTML = "<ul>";
      generalRanking.forEach(([player, score], index) => {
        generalLeaderboardHTML += `<li>${index+1}. ${player}: ${score}</li>`;
      });
      generalLeaderboardHTML += "</ul>";
    }
    document.getElementById('general-leaderboard-content').innerHTML = generalLeaderboardHTML;
  }
  
  // Met à jour les résultats de la dernière partie terminée
  function updateLastParty(data) {
    const finishedParties = data.parties.filter(party => party.finished);
    if (finishedParties.length === 0) {
      document.getElementById('last-party-results').textContent = "Aucune partie terminée récemment.";
      return;
    }
    finishedParties.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const timeB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return timeB - timeA;
    });
    const lastParty = finishedParties[0];
    let html = "<ul>";
    for (const [player, score] of Object.entries(lastParty.scores)) {
      html += `<li>${player}: ${score}</li>`;
    }
    html += "</ul>";
    document.getElementById('last-party-results').innerHTML = html;
  }
  
  // Fonction principale pour mettre à jour le dashboard
  async function renderDashboard() {
    const data = await loadData();
    updateDailyWeeklyStats(data);
    updateSeasonInfo(data);
    computeAchievements(data);
    updateLeaderboards(data);
    updateLastParty(data);
  }
  
  // Initialisation
  renderDashboard();
});
