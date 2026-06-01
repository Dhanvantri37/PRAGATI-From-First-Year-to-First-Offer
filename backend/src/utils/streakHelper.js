function getDecayedStreak(user) {
  if (!user.lastSolvedDate || user.streak <= 0) {
    return 0;
  }
  
  const now = new Date();
  
  // Get date strings in Asia/Kolkata timezone
  const nowStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: 'numeric', month: 'numeric', day: 'numeric' });
  const lastSolvedStr = new Date(user.lastSolvedDate).toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: 'numeric', month: 'numeric', day: 'numeric' });
  
  if (nowStr === lastSolvedStr) {
    return user.streak;
  }
  
  // Parse date parts to construct UTC dates at midnight
  const [nowM, nowD, nowY] = nowStr.split('/').map(Number);
  const [lsM, lsD, lsY] = lastSolvedStr.split('/').map(Number);
  
  const nowDateOnly = Date.UTC(nowY, nowM - 1, nowD);
  const lsDateOnly = Date.UTC(lsY, lsM - 1, lsD);
  
  const diffTime = nowDateOnly - lsDateOnly;
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysElapsed <= 1) {
    return user.streak;
  }
  
  const decay = daysElapsed - 1;
  return Math.max(0, user.streak - decay);
}

module.exports = { getDecayedStreak };
