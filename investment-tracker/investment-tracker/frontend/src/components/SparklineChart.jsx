import { LineChart, Line, ResponsiveContainer } from 'recharts';

function SparklineChart({ data, color = "#3b82f6", height = 40 }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-10 bg-gray-700/50 rounded animate-pulse" />
    );
  }

  // Convertir array de precios a formato para Recharts
  const chartData = data.map((value, index) => ({
    value: value,
    index: index
  }));

  // Determinar color basado en tendencia (primer vs último valor)
  const trend = data[data.length - 1] - data[0];
  const lineColor = color !== "#3b82f6" ? color : (trend >= 0 ? "#22c55e" : "#ef4444");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default SparklineChart;
