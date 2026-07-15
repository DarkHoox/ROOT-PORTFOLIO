import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ComparisonPoint {
  time: number;
  engine: number;
  naive: number;
  buyHold: number;
}

function formatDate(t: number): string {
  return new Date(t * 1000).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' });
}

export function EquityCurveChart({ data }: { data: ComparisonPoint[] }) {
  const rows = data.map((p) => ({ ...p, label: formatDate(p.time) }));
  const step = Math.max(1, Math.floor(rows.length / 8));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#1c2029" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#5b6270', fontSize: 11 }}
          axisLine={{ stroke: '#2c2c2a' }}
          tickLine={false}
          interval={step}
        />
        <YAxis
          tick={{ fill: '#5b6270', fontSize: 11 }}
          axisLine={{ stroke: '#2c2c2a' }}
          tickLine={false}
          domain={['auto', 'auto']}
          width={44}
        />
        <Tooltip
          contentStyle={{ background: '#151822', border: '1px solid #2c2c2a', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#9aa1ac' }}
          formatter={(value, name) => [typeof value === 'number' ? value.toFixed(1) : String(value), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9aa1ac' }} />
        <Line type="monotone" dataKey="engine" name="Signální engine" stroke="#3987e5" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="naive" name="Naivní strategie (každý flip)" stroke="#9085e9" dot={false} strokeWidth={1.5} strokeDasharray="2 3" />
        <Line type="monotone" dataKey="buyHold" name="Buy & Hold" stroke="#f0a202" dot={false} strokeWidth={2} strokeDasharray="4 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}
