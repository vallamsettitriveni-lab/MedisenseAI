'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
  status: string;
  reference_min?: number;
  reference_max?: number;
}

interface LabTrendChartProps {
  testName: string;
  unit?: string;
  data: DataPoint[];
}

export default function LabTrendChart({ testName, unit, data }: LabTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
        No historical trend data available for {testName}.
      </div>
    );
  }

  const refMin = data[0]?.reference_min;
  const refMax = data[0]?.reference_max;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{testName} Longitudinal Trend</h4>
          <p className="text-sm text-slate-500">Historical values measured over time ({unit || 'units'})</p>
        </div>
        {refMin !== undefined && refMax !== undefined && (
          <div className="text-xs bg-teal-50 text-teal-800 px-3 py-1 rounded-full font-medium border border-teal-200">
            Normal Ref Range: {refMin} – {refMax} {unit}
          </div>
        )}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as DataPoint;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                      <p className="font-semibold">{label}</p>
                      <p className="text-teal-300 font-bold">
                        Value: {item.value} {unit}
                      </p>
                      <p className={`font-semibold ${item.status === 'LOW' ? 'text-amber-400' : item.status === 'HIGH' ? 'text-red-400' : 'text-emerald-400'}`}>
                        Status: {item.status}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Reference Range Highlight Box */}
            {refMin !== undefined && refMax !== undefined && (
              <ReferenceArea y1={refMin} y2={refMax} fill="#ccfbf1" fillOpacity={0.4} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0f766e"
              strokeWidth={3}
              dot={{ r: 6, fill: "#0f766e", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
