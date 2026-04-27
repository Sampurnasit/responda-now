import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { Card } from "@/components/ui/card";
import { Activity, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const mData = [
  { time: '08:00', response: 4.2, resolution: 85 },
  { time: '10:00', response: 3.8, resolution: 88 },
  { time: '12:00', response: 5.1, resolution: 82 },
  { time: '14:00', response: 4.5, resolution: 90 },
  { time: '16:00', response: 3.2, resolution: 94 },
  { time: '18:00', response: 3.5, resolution: 92 },
  { time: '20:00', response: 4.0, resolution: 89 },
];

export function AdminAnalytics() {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Stats Cards */}
      <div className="col-span-12 grid grid-cols-4 gap-4">
        <StatItem 
          label="Avg. Response Time" 
          value="3.8m" 
          change="-12%" 
          trend="up" 
          icon={<Clock className="text-blue-400" />} 
        />
        <StatItem 
          label="Resolution Rate" 
          value="91.4%" 
          change="+5.2%" 
          trend="up" 
          icon={<CheckCircle2 className="text-green-400" />} 
        />
        <StatItem 
          label="Active Responders" 
          value="24" 
          change="+2" 
          trend="up" 
          icon={<Activity className="text-cyan-400" />} 
        />
        <StatItem 
          label="Crisis Mitigation" 
          value="88%" 
          change="+2.1%" 
          trend="up" 
          icon={<TrendingUp className="text-primary" />} 
        />
      </div>

      {/* Response Time Chart */}
      <div className="col-span-8 panel p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Response Efficiency (24h)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mData}>
              <defs>
                <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                unit="m"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="response" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorRes)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resolution Rate Bar */}
      <div className="col-span-4 panel p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Resolution by Zone</h3>
        <div className="h-[300px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={mData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
               <XAxis 
                 dataKey="time" 
                 stroke="#ffffff40" 
                 fontSize={10} 
                 tickLine={false} 
                 axisLine={false} 
               />
               <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '8px' }}
               />
               <Bar dataKey="resolution" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, change, trend, icon }: any) {
  return (
    <Card className="panel p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black tabular-nums">{value}</span>
          <span className={`text-[10px] font-bold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>{change}</span>
        </div>
      </div>
      <div className="p-3 bg-white/5 rounded-xl">
        {icon}
      </div>
    </Card>
  );
}
