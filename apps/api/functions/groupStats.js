import { app } from '@azure/functions';
import { requireAdmin, logAuthEvent } from '../shared/authMiddleware.js';
import { getContainer } from '../shared/db.js';

const CONTAINERS = {
    GROUPS: 'community-groups',
    MEMBERSHIPS: 'group-memberships',
    LEGACY_GROUPS: 'groups'
};

// US State coordinates for heat map
const STATE_COORDINATES = {
    'AL': { lat: 32.806671, lon: -86.791130, name: 'Alabama' },
    'AK': { lat: 61.370716, lon: -152.404419, name: 'Alaska' },
    'AZ': { lat: 33.729759, lon: -111.431221, name: 'Arizona' },
    'AR': { lat: 34.969704, lon: -92.373123, name: 'Arkansas' },
    'CA': { lat: 36.116203, lon: -119.681564, name: 'California' },
    'CO': { lat: 39.059811, lon: -105.311104, name: 'Colorado' },
    'CT': { lat: 41.597782, lon: -72.755371, name: 'Connecticut' },
    'DE': { lat: 39.318523, lon: -75.507141, name: 'Delaware' },
    'DC': { lat: 38.897438, lon: -77.026817, name: 'Washington DC' },
    'FL': { lat: 27.766279, lon: -81.686783, name: 'Florida' },
    'GA': { lat: 33.040619, lon: -83.643074, name: 'Georgia' },
    'HI': { lat: 21.094318, lon: -157.498337, name: 'Hawaii' },
    'ID': { lat: 44.240459, lon: -114.478828, name: 'Idaho' },
    'IL': { lat: 40.349457, lon: -88.986137, name: 'Illinois' },
    'IN': { lat: 39.849426, lon: -86.258278, name: 'Indiana' },
    'IA': { lat: 42.011539, lon: -93.210526, name: 'Iowa' },
    'KS': { lat: 38.526600, lon: -96.726486, name: 'Kansas' },
    'KY': { lat: 37.668140, lon: -84.670067, name: 'Kentucky' },
    'LA': { lat: 31.169546, lon: -91.867805, name: 'Louisiana' },
    'ME': { lat: 44.693947, lon: -69.381927, name: 'Maine' },
    'MD': { lat: 39.063946, lon: -76.802101, name: 'Maryland' },
    'MA': { lat: 42.230171, lon: -71.530106, name: 'Massachusetts' },
    'MI': { lat: 43.326618, lon: -84.536095, name: 'Michigan' },
    'MN': { lat: 45.694454, lon: -93.900192, name: 'Minnesota' },
    'MS': { lat: 32.741646, lon: -89.678696, name: 'Mississippi' },
    'MO': { lat: 38.456085, lon: -92.288368, name: 'Missouri' },
    'MT': { lat: 46.921925, lon: -110.454353, name: 'Montana' },
    'NE': { lat: 41.125370, lon: -98.268082, name: 'Nebraska' },
    'NV': { lat: 38.313515, lon: -117.055374, name: 'Nevada' },
    'NH': { lat: 43.452492, lon: -71.563896, name: 'New Hampshire' },
    'NJ': { lat: 40.298904, lon: -74.521011, name: 'New Jersey' },
    'NM': { lat: 34.840515, lon: -106.248482, name: 'New Mexico' },
    'NY': { lat: 42.165726, lon: -74.948051, name: 'New York' },
    'NC': { lat: 35.630066, lon: -79.806419, name: 'North Carolina' },
    'ND': { lat: 47.528912, lon: -99.784012, name: 'North Dakota' },
    'OH': { lat: 40.388783, lon: -82.764915, name: 'Ohio' },
    'OK': { lat: 35.565342, lon: -96.928917, name: 'Oklahoma' },
    'OR': { lat: 44.572021, lon: -122.070938, name: 'Oregon' },
    'PA': { lat: 40.590752, lon: -77.209755, name: 'Pennsylvania' },
    'RI': { lat: 41.680893, lon: -71.511780, name: 'Rhode Island' },
    'SC': { lat: 33.856892, lon: -80.945007, name: 'South Carolina' },
    'SD': { lat: 44.299782, lon: -99.438828, name: 'South Dakota' },
    'TN': { lat: 35.747845, lon: -86.692345, name: 'Tennessee' },
    'TX': { lat: 31.054487, lon: -97.563461, name: 'Texas' },
    'UT': { lat: 40.150032, lon: -111.862434, name: 'Utah' },
    'VT': { lat: 44.045876, lon: -72.710686, name: 'Vermont' },
    'VA': { lat: 37.769337, lon: -78.169968, name: 'Virginia' },
    'WA': { lat: 47.400902, lon: -121.490494, name: 'Washington' },
    'WV': { lat: 38.491226, lon: -80.954453, name: 'West Virginia' },
    'WI': { lat: 44.268543, lon: -89.616508, name: 'Wisconsin' },
    'WY': { lat: 42.755966, lon: -107.302490, name: 'Wyoming' }
};

/**
 * Group Stats API - Get statistics for groups including member counts
 * GET /api/group-stats - Get all group stats with member counts and location data
 */
app.http('groupStats', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'group-stats',
    handler: async (request, context) => {
        try {
            // Require admin access
            const authError = requireAdmin(request);
            if (authError) {
                logAuthEvent(context, request, 'GET_GROUP_STATS', 'group-stats', false);
                return authError;
            }
            logAuthEvent(context, request, 'GET_GROUP_STATS', 'group-stats', true);

            // Try to get groups from both possible containers
            let groups = [];
            
            try {
                const groupsContainer = getContainer(CONTAINERS.GROUPS);
                const { resources } = await groupsContainer.items
                    .query('SELECT * FROM c ORDER BY c.city ASC')
                    .fetchAll();
                groups = resources;
                context.log(`Found ${groups.length} groups in community-groups container`);
            } catch (e) {
                context.log('Error fetching from community-groups container:', e.message);
            }

            // If no groups found, try legacy groups container
            if (groups.length === 0) {
                try {
                    const legacyGroupsContainer = getContainer(CONTAINERS.LEGACY_GROUPS);
                    const { resources } = await legacyGroupsContainer.items
                        .query('SELECT * FROM c ORDER BY c.city ASC')
                        .fetchAll();
                    groups = resources;
                    context.log(`Found ${groups.length} groups in legacy groups container`);
                } catch (e) {
                    context.log('Error fetching from legacy groups container:', e.message);
                }
            }

            // Get membership counts for each group
            let membershipCounts = {};
            try {
                const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);
                const { resources: memberships } = await membershipsContainer.items
                    .query('SELECT c.groupId FROM c')
                    .fetchAll();
                
                context.log(`Found ${memberships.length} memberships`);
                
                // Count members per group
                for (const membership of memberships) {
                    if (membership.groupId) {
                        membershipCounts[membership.groupId] = (membershipCounts[membership.groupId] || 0) + 1;
                    }
                }
            } catch (e) {
                context.log('Error fetching memberships:', e.message);
            }

            // Enrich groups with member counts and coordinates
            const enrichedGroups = groups.map(group => {
                // Get state abbreviation for coordinates
                const stateAbbr = normalizeState(group.state);
                const stateCoords = STATE_COORDINATES[stateAbbr] || null;
                
                // Use stored memberCount or calculated from memberships
                const memberCount = membershipCounts[group.id] || group.memberCount || 0;
                
                return {
                    id: group.id,
                    name: group.name || `${group.city}, ${group.state}`,
                    city: group.city,
                    state: group.state,
                    stateAbbr: stateAbbr,
                    visibility: group.visibility || 'Public',
                    imageUrl: group.imageUrl,
                    description: group.description,
                    memberCount: memberCount,
                    coordinates: group.coordinates || stateCoords,
                    createdAt: group.createdAt,
                    updatedAt: group.updatedAt
                };
            });

            // Calculate state-level aggregation for heat map
            const stateStats = {};
            for (const group of enrichedGroups) {
                const stateAbbr = group.stateAbbr;
                if (stateAbbr && STATE_COORDINATES[stateAbbr]) {
                    if (!stateStats[stateAbbr]) {
                        stateStats[stateAbbr] = {
                            state: stateAbbr,
                            stateName: STATE_COORDINATES[stateAbbr].name,
                            lat: STATE_COORDINATES[stateAbbr].lat,
                            lon: STATE_COORDINATES[stateAbbr].lon,
                            groups: [],
                            totalMembers: 0
                        };
                    }
                    stateStats[stateAbbr].groups.push({
                        id: group.id,
                        name: group.name,
                        city: group.city,
                        memberCount: group.memberCount
                    });
                    stateStats[stateAbbr].totalMembers += group.memberCount;
                }
            }

            // Calculate totals
            const totalMembers = enrichedGroups.reduce((sum, g) => sum + g.memberCount, 0);
            const totalGroups = enrichedGroups.length;

            return {
                status: 200,
                jsonBody: {
                    groups: enrichedGroups,
                    stateStats: Object.values(stateStats),
                    summary: {
                        totalGroups,
                        totalMembers,
                        statesWithMembers: Object.keys(stateStats).length
                    }
                }
            };

        } catch (error) {
            context.log.error('Error in group-stats API:', error);
            return {
                status: 500,
                jsonBody: { error: 'Internal server error', details: error.message }
            };
        }
    }
});

/**
 * Normalize state names to abbreviations
 */
function normalizeState(state) {
    if (!state) return null;
    
    // If already an abbreviation
    const upperState = state.toUpperCase().trim();
    if (STATE_COORDINATES[upperState]) {
        return upperState;
    }
    
    // Map full names to abbreviations
    const stateMap = {
        'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
        'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
        'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'FLORIDA': 'FL',
        'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL',
        'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS', 'KENTUCKY': 'KY',
        'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD', 'MASSACHUSETTS': 'MA',
        'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
        'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH',
        'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
        'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
        'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI',
        'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN',
        'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA',
        'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
    };
    
    return stateMap[upperState] || null;
}
