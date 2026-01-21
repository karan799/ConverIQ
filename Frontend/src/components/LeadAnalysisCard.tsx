
import { useState } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer
} from 'recharts';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function LeadAnalysisCard({ score, metrics, factors, messages }: { score: number, metrics: any, factors: any[], messages: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Normalize metrics for Radar Chart (scale to 100)
    const chartData = [
        { subject: 'Sentiment', A: ((metrics.sentiment_score || 0) / 30) * 100, fullMark: 100 },
        { subject: 'Intent', A: ((metrics.buying_signal_score || 0) / 35) * 100, fullMark: 100 },
        { subject: 'Engage', A: ((metrics.engagement_score || 0) / 20) * 100, fullMark: 100 },
        { subject: 'Quality', A: ((metrics.response_quality || 0) / 15) * 100, fullMark: 100 },
    ];

    return (
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl overflow-hidden transition-all duration-300">

            {/* Header / Summary View */}
            <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                        📊 Lead Analysis
                    </h3>
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
                    </div>
                </div>

                {/* Star Rating Preview (Always Visible) */}
                <div className="flex items-center gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="relative cursor-default">
                            <svg className="w-6 h-6 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(100, (score - (star - 1) * 20) * 5))}%` }}>
                                <svg className={`w-6 h-6 ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0 space-y-4">

                    {/* Radar Chart */}
                    <div className="h-48 w-full relative -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Metrics"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="#8b5cf6"
                                    fillOpacity={0.4}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Score Explanation */}
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                        <h4 className="text-xs font-semibold text-white/70 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Score Breakdown
                        </h4>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Sentiment (30pts)</span>
                                <span className="text-white/80">{(metrics.sentiment_score || 0).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Buying Intent (35pts)</span>
                                <span className="text-white/80">{(metrics.buying_signal_score || 0).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Engagement (20pts)</span>
                                <span className="text-white/80">{(metrics.engagement_score || 0).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Quality (15pts)</span>
                                <span className="text-white/80">{(metrics.response_quality || 0).toFixed(1)}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-white/40 italic">
                                * Scores are calculated relative to industry benchmarks.
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Trail */}
                    {factors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-white/70">Key Factors</h4>
                            {factors.map((factor, idx) => (
                                <div key={idx} className={`p-2 rounded-lg text-xs ${factor.type === 'buying_signals' ? 'bg-green-500/10 text-green-300' :
                                    factor.type === 'urgency' ? 'bg-orange-500/10 text-orange-300' :
                                        factor.type === 'high_value' ? 'bg-yellow-500/10 text-yellow-300' :
                                            factor.type === 'objections' ? 'bg-red-500/10 text-red-300' :
                                                'bg-white/5 text-white/70'
                                    }`}>
                                    <div className="flex items-start gap-2">
                                        <span>{
                                            factor.type === 'buying_signals' ? '✅' :
                                                factor.type === 'urgency' ? '⏰' :
                                                    factor.type === 'objections' ? '⚠️' : '💡'
                                        }</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{factor.label}</p>
                                            {factor.evidence && (
                                                <p className="text-white/40 text-[10px] mt-0.5">{factor.evidence}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
