export function updateStreakOnWorkout(user, currentDate = new Date()) {
  user.stats = user.stats || {};
  const lastWorkoutDate = user.stats.last_workout_date;

  if (lastWorkoutDate) {
    const d1 = new Date(lastWorkoutDate);
    d1.setHours(0, 0, 0, 0);

    const d2 = new Date(currentDate);
    d2.setHours(0, 0, 0, 0);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // Worked out today already, streak remains the same
    } else if (diffDays === 1) {
      // Worked out yesterday, increment streak
      user.stats.current_streak_days = (user.stats.current_streak_days || 0) + 1;
    } else {
      // Missed at least one day, reset streak to 1
      user.stats.current_streak_days = 1;
    }
  } else {
    // First workout ever
    user.stats.current_streak_days = 1;
  }

  // Update longest streak if current streak exceeds it
  if (user.stats.current_streak_days > (user.stats.longest_streak_days || 0)) {
    user.stats.longest_streak_days = user.stats.current_streak_days;
  }

  user.stats.last_workout_date = currentDate;
}

export function checkAndResetStreak(user, currentDate = new Date()) {
  user.stats = user.stats || {};
  const lastWorkoutDate = user.stats.last_workout_date;

  if (lastWorkoutDate) {
    const d1 = new Date(lastWorkoutDate);
    d1.setHours(0, 0, 0, 0);

    const d2 = new Date(currentDate);
    d2.setHours(0, 0, 0, 0);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If diffDays > 1, the user missed at least yesterday, so streak is broken (0)
    // If diffDays === 1, the user has today to complete their workout, so streak is still active
    if (diffDays > 1) {
      user.stats.current_streak_days = 0;
      return true; // Indicates user was modified and needs saving
    }
  } else {
    if (user.stats.current_streak_days !== 0) {
      user.stats.current_streak_days = 0;
      return true;
    }
  }
  return false;
}
