const HttpRequest = require('@app-core/http-request');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { messages } = require('@app-core/messages');

const REQUIRED = ['HTTP', 'URL'];
const OPTIONAL = ['HEADERS', 'QUERY', 'BODY'];
const ALLKEYWORDS = [...REQUIRED, ...OPTIONAL];

function parseToJSON(str) {
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

const parseReqlineService = async (data) => {
  const { reqline } = data;

  if (typeof reqline !== 'string') {
    throwAppError(messages.BAD_REQLINE, ERROR_CODE.BADREQ);
  }

  // Check spacing
  for (let i = 0; i < reqline.length; i++) {
    if (reqline[i] === '|') {
      if (i === 0 || i === reqline.length - 1) {
        throwAppError(messages.INVALID_SPACING, ERROR_CODE.BADREQ);
      }
      if (reqline[i + 1] !== ' ' || reqline[i - 1] !== ' ') {
        throwAppError(messages.INVALID_SPACING, ERROR_CODE.BADREQ);
      }
      if (
        (i >= 2 && reqline[i - 2] === ' ') ||
        (i + 2 < reqline.length && reqline[i + 2] === ' ')
      ) {
        throwAppError(messages.MULTIPLE_SPACING_AROUND_PIPE, ERROR_CODE.BADREQ);
      }
    }
  }

  const parts = reqline.split('|');
  const parsedReq = {};

  // Check keyword order
  if (!parts[0].trim().startsWith('HTTP')) {
    throwAppError(messages.HTTP_MISSING, ERROR_CODE.BADREQ);
  }
  if (!parts[1].trim().startsWith('URL')) {
    throwAppError(messages.URL_MISSING, ERROR_CODE.BADREQ);
  }

  parts.forEach((reqPart) => {
    const part = reqPart.trim();
    const spaceIndex = part.indexOf(' ');
    if (spaceIndex === -1) {
      throwAppError(messages.NO_KEYWORD_SPACE, ERROR_CODE.BADREQ);
    }

    const keyword = part.substring(0, spaceIndex);
    const value = part.substring(spaceIndex + 1).trim();

    // Check value is not empty
    if (value === '') {
      throwAppError(messages.INVALID_VALUE, ERROR_CODE.BADREQ);
    }

    // Check for valid keyword
    if (!ALLKEYWORDS.includes(keyword)) {
      if (ALLKEYWORDS.includes(keyword.toUpperCase())) {
        throwAppError(messages.INVALID_CASE, ERROR_CODE.BADREQ);
      } else {
        throwAppError(messages.INVALID_KEYWORD, ERROR_CODE.BADREQ);
      }
    }

    // Check for duplicate keyword
    if (parsedReq[keyword]) {
      throwAppError(messages.DUPLICATE_KEY, ERROR_CODE.BADREQ);
    }

    // Keyword-specific validation
    if (keyword === 'HTTP') {
      if (!['GET', 'POST'].includes(value)) {
        throwAppError(messages.INVALID_HTTP_METHOD, ERROR_CODE.BADREQ);
      }
      parsedReq.HTTP = value;
    } else if (keyword === 'URL') {
      if (!value.startsWith('https')) {
        throwAppError(messages.INVALID_URL, ERROR_CODE.BADREQ);
      }
      parsedReq.URL = value;
    } else if (OPTIONAL.includes(keyword)) {
      const json = parseToJSON(value);
      if (!json) {
        throwAppError(messages.INVALID_HEADER_JSON, ERROR_CODE.BADREQ);
      }
      parsedReq[keyword] = json;
    }
  });

  // Append query string
  let fullUrl = parsedReq.URL;
  if (parsedReq.QUERY) {
    const queryString = Object.entries(parsedReq.QUERY)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    fullUrl += fullUrl.includes('?') ? `&${queryString}` : `?${queryString}`;
  }

  const startTime = Date.now();

  let response;

  try {
    if (parsedReq.HTTP === 'GET') {
      response = await HttpRequest.get(fullUrl, {
        headers: parsedReq.HEADERS || {},
      });
    } else if (parsedReq.HTTP === 'POST') {
      response = await HttpRequest.post(fullUrl, parsedReq.BODY || {}, {
        headers: parsedReq.HEADERS || {},
      });
    }
  } catch (error) {
    throwAppError('Error making request', ERROR_CODE.HTTPREQERR);
  }

  const stoptime = Date.now();
  const timeDiff = stoptime - startTime;

  return {
    request: {
      query: parsedReq.QUERY || {},
      body: parsedReq.BODY || {},
      headers: parsedReq.HEADERS || {},
      full_url: fullUrl,
    },
    response: {
      http_status: response.status,
      duration: timeDiff,
      request_start_timestamp: startTime,
      request_stop_timestamp: stoptime,
      response_data: response.data,
    },
  };
};

module.exports = parseReqlineService;
