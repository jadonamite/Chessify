import LeaderboardContent from '@/components/lobby/LeaderboardContent';

const prepareLeaderboardData = () => {
  // Simulated data preparation or fetching logic
  // For demonstration purposes, assume this function fetches or prepares necessary data
  return {
    // Example data
    rankings: [
      { name: 'Player 1', score: 100 },
      { name: 'Player 2', score: 80 },
    ],
  };
};

export default function LeaderboardPage() {
  const leaderboardData = prepareLeaderboardData();
  return <LeaderboardContent data={leaderboardData} />;
}