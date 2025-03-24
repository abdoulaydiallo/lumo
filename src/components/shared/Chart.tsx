// src/components/shared/Chart.tsx
"use client";

import {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartProps {
  type: "pie" | "bar" | "line";
  data: ChartData<"pie" | "bar" | "line"> | any;
  options?: ChartOptions<"pie" | "bar" | "line"> | any;
}

export default function Chart({ type, data, options }: ChartProps) {
  if (typeof window === "undefined") return null;

  return (
    <div className="w-full h-64">
      {type === "pie" ? (
        <Pie data={data} options={options} />
      ) : (
        <p>Type de graphique non pris en charge</p>
      )}
    </div>
  );
}
