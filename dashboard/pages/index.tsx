import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { format } from 'date-fns';
import io from 'socket.io-client';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Metrics, ExecutionTime, Prompt, Alert, QualityScores } from '../types/metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    prompts: [],
    models: {},
    qualityScores: {},
    executionTimes: [],
    alerts: [],
  });

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('metricsUpdate', (newMetrics: Metrics) => {
      setMetrics(newMetrics);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const executionTimeData: ChartData<'line'> = {
    labels: metrics.executionTimes.map((et: ExecutionTime) =>
      format(new Date(et.timestamp), 'HH:mm:ss')
    ),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: metrics.executionTimes.map((et: ExecutionTime) => et.duration),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const qualityScoreData: ChartData<'line'> = {
    labels: Object.keys(metrics.qualityScores).map((provider) => provider),
    datasets: [
      {
        label: 'Average Quality Score',
        data: (Object.values(metrics.qualityScores) as number[][]).map(
          (scores: number[]) => scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        ),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
        ],
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            PRISM Monitoring Dashboard
          </h1>

          {/* Alerts Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {metrics.alerts.slice(-5).map((alert: Alert, index: number) => (
                  <li key={index} className="px-4 py-4">
                    <div className="flex items-center">
                      {alert.severity === 'error' ? (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      ) : alert.severity === 'warning' ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.message}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(alert.timestamp), 'PPpp')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Model Usage Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Model Usage</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {Object.entries(metrics.models).map(([provider, count]) => (
                <div
                  key={provider}
                  className="bg-white overflow-hidden shadow rounded-lg"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {provider}
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {count}
                    </dd>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Response Times
              </h3>
              <div className="h-64">
                <Line data={executionTimeData} options={chartOptions} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quality Scores
              </h3>
              <div className="h-64">
                <Line data={qualityScoreData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Recent Prompts Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Prompts</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {metrics.prompts.slice(-5).map((prompt: Prompt, index: number) => (
                  <li key={index} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {prompt.taskType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(prompt.timestamp), 'PPpp')}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">{prompt.provider}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 