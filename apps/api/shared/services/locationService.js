/**
 * Location Service - Smart location-based group assignment
 * 
 * Features:
 * - Find nearest city group based on user coordinates
 * - Calculate distance using Haversine formula
 * - Auto-create new groups for unserved areas
 * 
 * @module locationService
 * @author SOMOS.tech
 */

import { getContainer } from '../db.js';

const CONTAINERS = {
  GROUPS: 'community-groups',
  MEMBERSHIPS: 'group-memberships'
};

// Distance threshold in miles - users within this distance will be assigned to existing city
const MAX_DISTANCE_MILES = 50;

/**
 * Major city coordinates for group matching
 * Coordinates are approximate city centers
 */
const CITY_COORDINATES = {
  'Seattle': { lat: 47.6062, lon: -122.3321, state: 'WA', groupId: 'group-seattle' },
  'New York': { lat: 40.7128, lon: -74.0060, state: 'NY', groupId: 'group-newyork' },
  'Boston': { lat: 42.3601, lon: -71.0589, state: 'MA', groupId: 'group-boston' },
  'Denver': { lat: 39.7392, lon: -104.9903, state: 'CO', groupId: 'group-denver' },
  'Washington': { lat: 38.9072, lon: -77.0369, state: 'DC', groupId: 'group-washingtondc' },
  'Atlanta': { lat: 33.7490, lon: -84.3880, state: 'GA', groupId: 'group-atlanta' },
  'San Francisco': { lat: 37.7749, lon: -122.4194, state: 'CA', groupId: 'group-sanfrancisco' },
  'Chicago': { lat: 41.8781, lon: -87.6298, state: 'IL', groupId: 'group-chicago' },
  'Austin': { lat: 30.2672, lon: -97.7431, state: 'TX', groupId: 'group-austin' },
  'Houston': { lat: 29.7604, lon: -95.3698, state: 'TX', groupId: 'group-houston' },
  'Los Angeles': { lat: 34.0522, lon: -118.2437, state: 'CA', groupId: 'group-losangeles' },
  'Miami': { lat: 25.7617, lon: -80.1918, state: 'FL', groupId: 'group-miami' },
  'Dallas': { lat: 32.7767, lon: -96.7970, state: 'TX', groupId: 'group-dallas' },
  'Phoenix': { lat: 33.4484, lon: -112.0740, state: 'AZ', groupId: 'group-phoenix' },
  'San Diego': { lat: 32.7157, lon: -117.1611, state: 'CA', groupId: 'group-sandiego' },
  'Philadelphia': { lat: 39.9526, lon: -75.1652, state: 'PA', groupId: 'group-philadelphia' },
  'Sacramento': { lat: 38.5816, lon: -121.4944, state: 'CA', groupId: 'group-sacramento' },
  'Dallas/Ft. Worth': { lat: 32.7555, lon: -97.3308, state: 'TX', groupId: 'group-dallasftworth' }
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Find the nearest city group based on user coordinates
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {Object|null} Nearest city info with distance, or null if none within threshold
 */
function findNearestCity(userLat, userLon) {
  if (!userLat || !userLon) {
    return null;
  }

  let nearestCity = null;
  let minDistance = Infinity;

  for (const [cityName, cityData] of Object.entries(CITY_COORDINATES)) {
    const distance = calculateDistance(userLat, userLon, cityData.lat, cityData.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = {
        city: cityName,
        state: cityData.state,
        groupId: cityData.groupId,
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
      };
    }
  }

  // Only return if within threshold
  if (nearestCity && nearestCity.distance <= MAX_DISTANCE_MILES) {
    return nearestCity;
  }

  return null;
}

/**
 * Generate slug from city and state
 */
function generateSlug(city, state) {
  return `${city}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Create a new city group for an unserved location
 * @param {string} city - City name
 * @param {string} state - State/region name
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Created group
 */
async function createCityGroup(city, state, lat, lon) {
  const groupsContainer = getContainer(CONTAINERS.GROUPS);
  
  const slug = generateSlug(city, state);
  const groupId = `group-${slug}`;
  
  // Check if group already exists
  try {
    const { resource: existing } = await groupsContainer.item(groupId, groupId).read();
    if (existing) {
      return existing;
    }
  } catch (e) {
    // Group doesn't exist, create it
  }

  const newGroup = {
    id: groupId,
    name: state ? `${city}, ${state}` : city,
    city: city,
    state: state || '',
    slug: slug,
    visibility: 'Public',
    // Use Unsplash for a generic city image
    imageUrl: `https://source.unsplash.com/400x300/?${encodeURIComponent(city)},city,skyline`,
    thumbnailUrl: `https://source.unsplash.com/200x150/?${encodeURIComponent(city)},city`,
    description: `Welcome to the ${city}${state ? ', ' + state : ''} SOMOS community chapter!`,
    memberCount: 0,
    coordinates: { lat, lon },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'auto-location-service'
  };

  const { resource: created } = await groupsContainer.items.create(newGroup);
  
  // Add to CITY_COORDINATES cache for future lookups
  CITY_COORDINATES[city] = { lat, lon, state, groupId };
  
  return created;
}

/**
 * Add user to a group (creates membership)
 * @param {string} groupId - Group ID
 * @param {Object} user - User object with id, email, displayName
 * @returns {Promise<Object>} Membership record
 */
async function addUserToGroup(groupId, user) {
  const groupsContainer = getContainer(CONTAINERS.GROUPS);
  const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);
  
  // Check if already a member
  try {
    const { resources: existing } = await membershipsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.groupId = @groupId AND c.userId = @userId',
        parameters: [
          { name: '@groupId', value: groupId },
          { name: '@userId', value: user.id }
        ]
      })
      .fetchAll();

    if (existing.length > 0) {
      return { alreadyMember: true, membership: existing[0] };
    }
  } catch (e) {
    // Continue to create membership
  }

  // Create membership
  const membership = {
    id: `membership-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    groupId,
    userId: user.id,
    userEmail: user.email || '',
    userName: user.displayName || user.email?.split('@')[0] || 'Member',
    userPhoto: user.profilePicture || null,
    role: 'member',
    joinType: 'auto-location', // Mark as auto-assigned
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    notificationsEnabled: true
  };

  await membershipsContainer.items.create(membership);

  // Update group member count
  try {
    const { resource: group } = await groupsContainer.item(groupId, groupId).read();
    if (group) {
      group.memberCount = (group.memberCount || 0) + 1;
      group.updatedAt = new Date().toISOString();
      await groupsContainer.item(groupId, groupId).replace(group);
    }
  } catch (e) {
    // Non-critical error
  }

  return { alreadyMember: false, membership };
}

/**
 * Assign user to their nearest city group
 * Main entry point for auto-location feature
 * 
 * @param {Object} user - User object with id, email, displayName
 * @param {Object} location - Location object with city, region, latitude, longitude
 * @returns {Promise<Object|null>} Assignment result or null if no location
 */
async function assignUserToNearestGroup(user, location) {
  if (!location || (!location.latitude && !location.city)) {
    return null;
  }

  let result = {
    assigned: false,
    groupId: null,
    groupName: null,
    distance: null,
    method: null
  };

  // Try coordinate-based matching first (most accurate)
  if (location.latitude && location.longitude) {
    const nearestCity = findNearestCity(location.latitude, location.longitude);
    
    if (nearestCity) {
      // Found a nearby existing group
      const membershipResult = await addUserToGroup(nearestCity.groupId, user);
      
      result = {
        assigned: true,
        groupId: nearestCity.groupId,
        groupName: `${nearestCity.city}, ${nearestCity.state}`,
        distance: nearestCity.distance,
        method: 'coordinate-match',
        alreadyMember: membershipResult.alreadyMember
      };
    } else if (location.city) {
      // No nearby group, create one for their city
      const newGroup = await createCityGroup(
        location.city,
        location.region || '',
        location.latitude,
        location.longitude
      );
      
      const membershipResult = await addUserToGroup(newGroup.id, user);
      
      result = {
        assigned: true,
        groupId: newGroup.id,
        groupName: newGroup.name,
        distance: 0,
        method: 'new-group-created',
        alreadyMember: membershipResult.alreadyMember
      };
    }
  } else if (location.city) {
    // Fallback: Try to match by city name
    const cityMatch = Object.entries(CITY_COORDINATES).find(
      ([cityName]) => cityName.toLowerCase() === location.city.toLowerCase()
    );
    
    if (cityMatch) {
      const [cityName, cityData] = cityMatch;
      const membershipResult = await addUserToGroup(cityData.groupId, user);
      
      result = {
        assigned: true,
        groupId: cityData.groupId,
        groupName: `${cityName}, ${cityData.state}`,
        distance: null,
        method: 'city-name-match',
        alreadyMember: membershipResult.alreadyMember
      };
    }
  }

  return result;
}

/**
 * Get user's assigned groups
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of group memberships
 */
async function getUserGroups(userId) {
  const membershipsContainer = getContainer(CONTAINERS.MEMBERSHIPS);
  
  const { resources } = await membershipsContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }]
    })
    .fetchAll();

  return resources;
}

export {
  findNearestCity,
  calculateDistance,
  createCityGroup,
  addUserToGroup,
  assignUserToNearestGroup,
  getUserGroups,
  CITY_COORDINATES,
  MAX_DISTANCE_MILES
};
