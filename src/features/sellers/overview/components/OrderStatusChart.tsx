import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OrderStatus } from "./types";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("@/components/shared/Chart"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse bg-muted rounded" />,
});

interface OrderStatusChartProps {
  orders: Array<{ status: OrderStatus }>;
}

export function OrderStatusChart({ orders }: OrderStatusChartProps) {
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  const chartData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: [
          "#f97316", // pending
          "#facc15", // in_progress
          "#22c55e", // delivered
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des commandes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Chart type="pie" data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
