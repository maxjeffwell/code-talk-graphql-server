import axios from 'axios';

const API_URL = process.env.TEST_API_URL || 'http://localhost:8000/graphql';

// Create axios instance with cookie support
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store cookies between requests (for test environment)
let cookies = '';
let csrfToken = '';

// Helper to extract CSRF token from cookie string
const extractCsrfToken = (cookieStr) => {
  const match = cookieStr.match(/csrf-token=([^;]+)/);
  return match ? match[1] : '';
};

// Interceptor to handle cookies and extract CSRF token
api.interceptors.response.use((response) => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) {
    cookies = setCookie.map(c => c.split(';')[0]).join('; ');
    // Extract CSRF token from cookies
    csrfToken = extractCsrfToken(cookies);
  }
  return response;
});

api.interceptors.request.use((config) => {
  if (cookies) {
    config.headers.Cookie = cookies;
  }
  // Add CSRF token header for mutations
  if (csrfToken) {
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

// Clear cookies (for logout or between tests)
export const clearCookies = () => {
  cookies = '';
  csrfToken = '';
};

// Fetch CSRF token by making a GET request (server sets cookie on GET)
export const fetchCsrfToken = async () => {
  // Make a GET request to trigger CSRF cookie setting
  await axios.get(API_URL.replace('/graphql', '/health'), {
    withCredentials: true,
  }).then(response => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      cookies = setCookie.map(c => c.split(';')[0]).join('; ');
      csrfToken = extractCsrfToken(cookies);
    }
  }).catch(() => {
    // Health endpoint might not exist in test, that's okay
  });
};

// Authentication mutations (httpOnly cookie-based)
export const signIn = async (variables) => {
  const response = await api.post('', {
    query: `
      mutation ($login: String!, $password: String!) {
        signIn(login: $login, password: $password) {
          success
          user {
            id
            username
            email
            role
          }
        }
      }
    `,
    variables,
  });
  return response;
};

export const signUp = async (variables) => {
  const response = await api.post('', {
    query: `
      mutation ($username: String!, $email: String!, $password: String!) {
        signUp(username: $username, email: $email, password: $password) {
          success
          user {
            id
            username
            email
            role
          }
        }
      }
    `,
    variables,
  });
  return response;
};

export const signOut = async () => {
  const response = await api.post('', {
    query: `
      mutation {
        signOut
      }
    `,
  });
  clearCookies();
  return response;
};

// User queries
export const me = async () => {
  return api.post('', {
    query: `
      {
        me {
          id
          email
          username
        }
      }
    `,
  });
};

export const user = async (variables) => {
  return api.post('', {
    query: `
      query ($id: ID!) {
        user(id: $id) {
          id
          username
          email
          role
        }
      }
    `,
    variables,
  });
};

export const users = async () => {
  return api.post('', {
    query: `
      {
        users {
          id
          username
          email
          role
        }
      }
    `,
  });
};

// Message queries
export const messages = async (variables = {}) => {
  return api.post('', {
    query: `
      query ($limit: Int, $cursor: String) {
        messages(limit: $limit, cursor: $cursor) {
          edges {
            id
            text
            createdAt
            user {
              id
              username
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables,
  });
};

export const createMessage = async (variables) => {
  return api.post('', {
    query: `
      mutation ($text: String!, $roomId: ID) {
        createMessage(text: $text, roomId: $roomId) {
          id
          text
          createdAt
          user {
            id
            username
          }
        }
      }
    `,
    variables,
  });
};

export const deleteMessage = async (variables) => {
  return api.post('', {
    query: `
      mutation ($id: ID!) {
        deleteMessage(id: $id) {
          id
          text
        }
      }
    `,
    variables,
  });
};

// Room queries and mutations
export const rooms = async () => {
  return api.post('', {
    query: `
      {
        rooms {
          id
          title
        }
      }
    `,
  });
};

export const room = async (variables) => {
  return api.post('', {
    query: `
      query ($id: ID!) {
        room(id: $id) {
          id
          title
          messages {
            id
            text
          }
          users {
            id
            username
          }
        }
      }
    `,
    variables,
  });
};

export const createRoom = async (variables) => {
  return api.post('', {
    query: `
      mutation ($title: String!) {
        createRoom(title: $title) {
          id
          title
        }
      }
    `,
    variables,
  });
};

export default {
  signIn,
  signUp,
  signOut,
  me,
  user,
  users,
  messages,
  createMessage,
  deleteMessage,
  rooms,
  room,
  createRoom,
  clearCookies,
};
