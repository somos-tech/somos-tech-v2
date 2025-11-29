import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StateData {
    state: string;
    stateName: string;
    lat: number;
    lon: number;
    groups: Array<{
        id: string;
        name: string;
        city: string;
        memberCount: number;
    }>;
    totalMembers: number;
}

interface USHeatMapProps {
    stateStats: StateData[];
    maxMembers?: number;
}

// US State paths for SVG map (simplified coordinates)
const STATE_PATHS: Record<string, { path: string; cx: number; cy: number }> = {
    'WA': { path: 'M78,18 L125,18 L125,55 L78,55 Z', cx: 101, cy: 36 },
    'OR': { path: 'M78,55 L125,55 L125,100 L78,100 Z', cx: 101, cy: 77 },
    'CA': { path: 'M78,100 L125,100 L125,190 L78,190 Z', cx: 101, cy: 145 },
    'NV': { path: 'M125,70 L165,70 L165,145 L125,145 Z', cx: 145, cy: 107 },
    'ID': { path: 'M125,18 L165,18 L165,85 L125,85 Z', cx: 145, cy: 51 },
    'MT': { path: 'M165,18 L260,18 L260,65 L165,65 Z', cx: 212, cy: 41 },
    'WY': { path: 'M165,65 L250,65 L250,115 L165,115 Z', cx: 207, cy: 90 },
    'UT': { path: 'M165,100 L210,100 L210,155 L165,155 Z', cx: 187, cy: 127 },
    'CO': { path: 'M210,100 L290,100 L290,155 L210,155 Z', cx: 250, cy: 127 },
    'AZ': { path: 'M125,155 L195,155 L195,220 L125,220 Z', cx: 160, cy: 187 },
    'NM': { path: 'M195,155 L275,155 L275,220 L195,220 Z', cx: 235, cy: 187 },
    'ND': { path: 'M260,18 L335,18 L335,55 L260,55 Z', cx: 297, cy: 36 },
    'SD': { path: 'M260,55 L335,55 L335,95 L260,95 Z', cx: 297, cy: 75 },
    'NE': { path: 'M260,95 L345,95 L345,135 L260,135 Z', cx: 302, cy: 115 },
    'KS': { path: 'M275,135 L365,135 L365,175 L275,175 Z', cx: 320, cy: 155 },
    'OK': { path: 'M275,175 L375,175 L375,215 L275,215 Z', cx: 325, cy: 195 },
    'TX': { path: 'M260,215 L380,215 L380,310 L260,310 Z', cx: 320, cy: 262 },
    'MN': { path: 'M335,18 L395,18 L395,85 L335,85 Z', cx: 365, cy: 51 },
    'IA': { path: 'M345,85 L410,85 L410,130 L345,130 Z', cx: 377, cy: 107 },
    'MO': { path: 'M365,130 L425,130 L425,190 L365,190 Z', cx: 395, cy: 160 },
    'AR': { path: 'M375,190 L430,190 L430,240 L375,240 Z', cx: 402, cy: 215 },
    'LA': { path: 'M380,240 L440,240 L440,290 L380,290 Z', cx: 410, cy: 265 },
    'WI': { path: 'M395,35 L450,35 L450,95 L395,95 Z', cx: 422, cy: 65 },
    'IL': { path: 'M410,95 L455,95 L455,175 L410,175 Z', cx: 432, cy: 135 },
    'MI': { path: 'M435,25 L510,25 L510,100 L435,100 Z', cx: 472, cy: 62 },
    'IN': { path: 'M455,100 L495,100 L495,165 L455,165 Z', cx: 475, cy: 132 },
    'OH': { path: 'M495,90 L545,90 L545,150 L495,150 Z', cx: 520, cy: 120 },
    'KY': { path: 'M455,155 L535,155 L535,195 L455,195 Z', cx: 495, cy: 175 },
    'TN': { path: 'M440,190 L535,190 L535,225 L440,225 Z', cx: 487, cy: 207 },
    'MS': { path: 'M430,225 L470,225 L470,285 L430,285 Z', cx: 450, cy: 255 },
    'AL': { path: 'M470,215 L510,215 L510,285 L470,285 Z', cx: 490, cy: 250 },
    'GA': { path: 'M510,205 L565,205 L565,275 L510,275 Z', cx: 537, cy: 240 },
    'FL': { path: 'M510,275 L590,275 L590,340 L510,340 Z', cx: 550, cy: 307 },
    'SC': { path: 'M540,195 L590,195 L590,235 L540,235 Z', cx: 565, cy: 215 },
    'NC': { path: 'M530,165 L610,165 L610,200 L530,200 Z', cx: 570, cy: 182 },
    'VA': { path: 'M530,135 L600,135 L600,170 L530,170 Z', cx: 565, cy: 152 },
    'WV': { path: 'M530,115 L565,115 L565,150 L530,150 Z', cx: 547, cy: 132 },
    'MD': { path: 'M565,125 L605,125 L605,145 L565,145 Z', cx: 585, cy: 135 },
    'DE': { path: 'M595,115 L610,115 L610,135 L595,135 Z', cx: 602, cy: 125 },
    'NJ': { path: 'M590,95 L610,95 L610,125 L590,125 Z', cx: 600, cy: 110 },
    'PA': { path: 'M545,80 L600,80 L600,115 L545,115 Z', cx: 572, cy: 97 },
    'NY': { path: 'M545,40 L610,40 L610,85 L545,85 Z', cx: 577, cy: 62 },
    'CT': { path: 'M600,70 L620,70 L620,85 L600,85 Z', cx: 610, cy: 77 },
    'RI': { path: 'M615,70 L625,70 L625,82 L615,82 Z', cx: 620, cy: 76 },
    'MA': { path: 'M600,55 L630,55 L630,72 L600,72 Z', cx: 615, cy: 63 },
    'VT': { path: 'M585,30 L600,30 L600,55 L585,55 Z', cx: 592, cy: 42 },
    'NH': { path: 'M600,25 L615,25 L615,55 L600,55 Z', cx: 607, cy: 40 },
    'ME': { path: 'M615,10 L640,10 L640,55 L615,55 Z', cx: 627, cy: 32 },
    'AK': { path: 'M78,250 L150,250 L150,310 L78,310 Z', cx: 114, cy: 280 },
    'HI': { path: 'M180,280 L240,280 L240,310 L180,310 Z', cx: 210, cy: 295 },
    'DC': { path: 'M575,140 L585,140 L585,150 L575,150 Z', cx: 580, cy: 145 }
};

export default function USHeatMap({ stateStats, maxMembers }: USHeatMapProps) {
    // Create a map of state -> total members
    const stateData = useMemo(() => {
        const data: Record<string, StateData> = {};
        for (const stat of stateStats) {
            data[stat.state] = stat;
        }
        return data;
    }, [stateStats]);

    // Calculate max for color scaling
    const calculatedMax = useMemo(() => {
        if (maxMembers) return maxMembers;
        return Math.max(...stateStats.map(s => s.totalMembers), 1);
    }, [stateStats, maxMembers]);

    // Get color intensity based on member count
    const getColor = (members: number): string => {
        if (members === 0) return 'rgba(131, 148, 167, 0.2)'; // Dim gray for no members
        
        const intensity = Math.min(members / calculatedMax, 1);
        
        // Scale from dim green to bright neon green
        if (intensity < 0.25) {
            return 'rgba(0, 255, 145, 0.25)';
        } else if (intensity < 0.5) {
            return 'rgba(0, 255, 145, 0.45)';
        } else if (intensity < 0.75) {
            return 'rgba(0, 255, 145, 0.65)';
        } else {
            return 'rgba(0, 255, 145, 0.9)';
        }
    };

    const getStrokeColor = (members: number): string => {
        if (members === 0) return 'rgba(131, 148, 167, 0.3)';
        return 'rgba(0, 255, 145, 0.6)';
    };

    const totalMembers = stateStats.reduce((sum, s) => sum + s.totalMembers, 0);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">Member Distribution</h3>
                    <p className="text-sm" style={{ color: '#8394A7' }}>
                        {totalMembers.toLocaleString()} members across {stateStats.filter(s => s.totalMembers > 0).length} states
                    </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2 text-xs" style={{ color: '#8394A7' }}>
                    <span>Low</span>
                    <div className="flex h-3">
                        <div className="w-4 rounded-l" style={{ backgroundColor: 'rgba(0, 255, 145, 0.25)' }} />
                        <div className="w-4" style={{ backgroundColor: 'rgba(0, 255, 145, 0.45)' }} />
                        <div className="w-4" style={{ backgroundColor: 'rgba(0, 255, 145, 0.65)' }} />
                        <div className="w-4 rounded-r" style={{ backgroundColor: 'rgba(0, 255, 145, 0.9)' }} />
                    </div>
                    <span>High</span>
                </div>
            </div>

            {/* Map */}
            <TooltipProvider>
                <svg
                    viewBox="0 0 700 350"
                    className="w-full h-auto"
                    style={{ maxHeight: '400px' }}
                >
                    {/* Background */}
                    <rect x="0" y="0" width="700" height="350" fill="#051323" rx="8" />
                    
                    {/* State shapes */}
                    {Object.entries(STATE_PATHS).map(([stateAbbr, { path, cx, cy }]) => {
                        const data = stateData[stateAbbr];
                        const members = data?.totalMembers || 0;
                        const groups = data?.groups || [];
                        
                        return (
                            <Tooltip key={stateAbbr}>
                                <TooltipTrigger asChild>
                                    <g className="cursor-pointer transition-all hover:opacity-80">
                                        <path
                                            d={path}
                                            fill={getColor(members)}
                                            stroke={getStrokeColor(members)}
                                            strokeWidth={members > 0 ? 1.5 : 0.5}
                                            className="transition-all duration-200"
                                        />
                                        {/* State abbreviation */}
                                        <text
                                            x={cx}
                                            y={cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill={members > 0 ? '#FFFFFF' : '#8394A7'}
                                            fontSize="10"
                                            fontWeight={members > 0 ? '600' : '400'}
                                            className="pointer-events-none"
                                        >
                                            {stateAbbr}
                                        </text>
                                        {/* Member count badge for states with high counts */}
                                        {members >= 10 && (
                                            <g>
                                                <circle
                                                    cx={cx + 15}
                                                    cy={cy - 10}
                                                    r="8"
                                                    fill="#00FF91"
                                                />
                                                <text
                                                    x={cx + 15}
                                                    y={cy - 10}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#051323"
                                                    fontSize="7"
                                                    fontWeight="700"
                                                >
                                                    {members > 99 ? '99+' : members}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                </TooltipTrigger>
                                <TooltipContent 
                                    side="top" 
                                    className="p-3 max-w-xs"
                                    style={{ backgroundColor: '#0a1f35', borderColor: '#00FF91' }}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="font-semibold text-white">
                                                {data?.stateName || stateAbbr}
                                            </span>
                                            <span className="text-sm font-bold" style={{ color: '#00FF91' }}>
                                                {members} member{members !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {groups.length > 0 && (
                                            <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.2)' }}>
                                                {groups.slice(0, 5).map((group) => (
                                                    <div key={group.id} className="flex justify-between text-xs">
                                                        <span style={{ color: '#8394A7' }}>{group.city}</span>
                                                        <span className="text-white">{group.memberCount}</span>
                                                    </div>
                                                ))}
                                                {groups.length > 5 && (
                                                    <div className="text-xs" style={{ color: '#8394A7' }}>
                                                        +{groups.length - 5} more groups
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {groups.length === 0 && (
                                            <div className="text-xs" style={{ color: '#8394A7' }}>
                                                No groups in this state
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </svg>
            </TooltipProvider>
        </div>
    );
}
