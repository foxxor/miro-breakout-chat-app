"use strict";

const https = require("https");

class MiroApi {
  /**
   * @param {String} accessToken
   */
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Gets the list of Board Team Members for a given Board ID
   * @async
   * @param  {string} boardId
   * @return {Object}
   */
  async getBoardTeamMembers(boardId) {
    return await this.makeRequest("GET", `boards/${boardId}/user-connections`);
  }

  /**
   * Performs a request to the Miro API
   *
   * @param  {String} method
   * @param  {String} uri
   * @param  {Object} params
   * @return {Promise|Object}
   */
  makeRequest(method, uri, params = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.miro.com",
        path: `/v1/${uri}`,
        method: method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
      };

      if (params) {
        options.path += `?${new URLSearchParams(params).toString()}`;
      }

      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          const parsedData = JSON.parse(data);
          if (parsedData.size > parsedData.limit + parsedData.offset) {
            makeRequest(method, uri, {
              ...params,
              offset: parsedData.limit + parsedData.offset,
            }).then(nextPagesData);
            {
              resolve({ ...parsedData.data, ...nextPagesData });
            }
          }

          resolve(parsedData.data);
        });
      });

      request.on("error", (err) => {
        return reject(
          new Error(`${this.constructor.name}: Request '${uri}' failed.`)
        );
      });
      request.end();
    });
  }
}

module.exports = MiroApi;
