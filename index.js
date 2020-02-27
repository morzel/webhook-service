'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // creates http server
const request = require('request');
const token = '0123456789'; // type here your verification token

const username = "1b923fa4c4f4b38c56b9e327e5f1945f";
const password = "680b6c251942759b4bd667e7b1a9cedf";
const shop = "time-rediscovered";
const api_version = "2019-10";
const resource = "graphql.json";

app.listen(3000, () => console.log('[ChatBot] Webhook is listening'));

app.get('/', (req, res) => {
  // check if verification token is correct
  if (req.query.token !== token) {
    return res.sendStatus(401);
  }

  // return challenge
  return res.end(req.query.challenge);
});

app.post('/', (req, res) => {
  // check if verification token is correct
  if (req.query.token !== token) {
    return res.sendStatus(401);
  }

  // get request body
  const params = req.body["result"]["sessionParameters"];
  console.log(params);

  var gender = params.Gender;
  var make = params.Make;
  var budget = params.Spend;

  if (budget < 1500) {
    budget = "Less than £1500"
  } else if (budget >= 1500 && budget < 3000) {
    budget = "£1500 - £3000"
  } else if (budget >= 3000 && budget < 5000) {
    budget = "£3000 - £5000"
  } else if (budget >= 3000 && budget < 5000) {
    budget = "£5000 - £10000"
  } else {
    budget = "More than £10000"
  }

  const headers = {
    'Content-Type': 'application/graphql',
    'X-Shopify-Access-Token': password
  };

  const queryString = `
  {
    products(first:5, query:"published_status:published AND available_for_sale:true ${gender} ${make} ${budget}") {
      edges {
        node {
          id
          title
          onlineStoreUrl
          totalInventory
          featuredImage {
            id
            originalSrc
          }
          tags
        }
      }
    }
  }
  `;

  const options = {
    url: `https://${shop}.myshopify.com/admin/api/${api_version}/${resource}`,
    method: 'POST',
    headers: headers,
    body: queryString
  };

  function callback(error, response, body) {
    let responses = [];
    if (!error && response.statusCode == 200) {
      let products = JSON.parse(body).data.products.edges;
      // console.log(products);
      if (products.length > 0) {
        responses.push({
          "type": "cards",
          "filters": [],
          "elements": []
        });
        let elements = [];
        for (let product of products) {
          console.log(product.node.onlineStoreUrl);
          console.log(product.node.totalInventory);
          console.log(product.node.inventoryQuantity);
          console.log(product.node.availableForSale);
          elements.push({
            "title": product.node.title,
            "imageUrl": product.node.featuredImage.originalSrc,
            "buttons": [
              {
                "type": "url",
                "title": "Shop Now",
                "value": product.node.onlineStoreUrl
              }
            ]
          });
        }
        responses[0]["elements"] = elements;
      } else {
        responses.push({
          "type": "text",
          "elements": ["Sorry, couldn't find the right one for you."]
        });
      }
    } else {
      responses.push({
        "type": "text",
        "elements": [error.message]
      });
    }

    const data = {
      responses: responses
    };
    res.json(data);
  }

  request(options, callback);
});