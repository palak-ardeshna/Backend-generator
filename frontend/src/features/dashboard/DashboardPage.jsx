import { useGetDashboardStatsQuery } from './dashboardApi';

export default function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardStatsQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading dashboard data</div>;

  return (
    <div>
      <h1>Overview</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
} 