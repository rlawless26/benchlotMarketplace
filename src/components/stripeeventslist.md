robertlawless@Roberts-MacBook-Pro benchlot % stripe events list
{
  "object": "list",
  "data": [
    {
      "id": "evt_1RG8oAPJSOllkrGgiwXdKWdG",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745197562,
      "data": {
        "object": {
          "object": "balance",
          "available": [
            {
              "amount": 97081,
              "currency": "usd",
              "source_types": {
                "card": 97081
              }
            }
          ],
          "connect_reserved": [
            {
              "amount": 0,
              "currency": "usd"
            }
          ],
          "livemode": false,
          "pending": [
            {
              "amount": 0,
              "currency": "usd",
              "source_types": {
                "card": 0
              }
            }
          ]
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": null,
        "idempotency_key": null
      },
      "type": "balance.available"
    },
    {
      "id": "evt_3RG5jmPJSOllkrGg1ZxN5dRs",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745185758,
      "data": {
        "object": {
          "id": "pi_3RG5jmPJSOllkrGg16qkMyKD",
          "object": "payment_intent",
          "amount": 189700,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG5jmPJSOllkrGg16qkMyKD_secret_myOE4DPYqNPxTOpVlFRPWIzEr",
          "confirmation_method": "automatic",
          "created": 1745185758,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_l6PfxtSGyEuie3",
        "idempotency_key": "stripe-node-retry-954fc873-dce4-416c-8692-4043909caba5"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG2ZtPJSOllkrGg1UDrJW4L",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745173613,
      "data": {
        "object": {
          "id": "pi_3RG2ZtPJSOllkrGg1jOaF8C1",
          "object": "payment_intent",
          "amount": 99500,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG2ZtPJSOllkrGg1jOaF8C1_secret_iEbOUMO9k3fKL7BYekHxBN4pi",
          "confirmation_method": "automatic",
          "created": 1745173613,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_USnpJHZN3wxlxs",
        "idempotency_key": "stripe-node-retry-5dc6bc98-ecad-4632-b5bf-bd406768708d"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG2ZtPJSOllkrGg0wuA23io",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745173613,
      "data": {
        "object": {
          "id": "pi_3RG2ZtPJSOllkrGg0Anypobo",
          "object": "payment_intent",
          "amount": 99500,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG2ZtPJSOllkrGg0Anypobo_secret_A7vXyOCkyh2Re5TuDhtupyglS",
          "confirmation_method": "automatic",
          "created": 1745173613,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_vduzxxUrR3pNAI",
        "idempotency_key": "stripe-node-retry-f15bd2ad-b886-4b61-a897-1a960a4e5513"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG27pPJSOllkrGg2bYIErFF",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171873,
      "data": {
        "object": {
          "id": "pi_3RG27pPJSOllkrGg2JrAyeMz",
          "object": "payment_intent",
          "amount": 99500,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG27pPJSOllkrGg2JrAyeMz_secret_oYTZjmElsUMmwZY8ml4OAFDFk",
          "confirmation_method": "automatic",
          "created": 1745171873,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_jIvxG8ivJGcx6F",
        "idempotency_key": "stripe-node-retry-20fc4987-3cec-4ff6-b2c0-16fb2838e2a2"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG27pPJSOllkrGg1VozJBA7",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171873,
      "data": {
        "object": {
          "id": "pi_3RG27pPJSOllkrGg187cVBaW",
          "object": "payment_intent",
          "amount": 99500,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG27pPJSOllkrGg187cVBaW_secret_vkdDm4NDfxcYdKmmTo0iWGPWC",
          "confirmation_method": "automatic",
          "created": 1745171873,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_n4co2lY9yEdJIm",
        "idempotency_key": "stripe-node-retry-b79c0213-8f08-47c3-a9d9-4f88c26654e7"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG1vwPJSOllkrGg01dy2zqy",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171136,
      "data": {
        "object": {
          "id": "pi_3RG1vwPJSOllkrGg06Xy01pP",
          "object": "payment_intent",
          "amount": 54400,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG1vwPJSOllkrGg06Xy01pP_secret_cEaHilRWRhUcJn2bt2y4DL4fz",
          "confirmation_method": "automatic",
          "created": 1745171136,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_n1uQptm1gARznk",
        "idempotency_key": "stripe-node-retry-da3a69c4-ce5a-4d27-b6a6-6afa33dde77c"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG1vsPJSOllkrGg1SuFmuWV",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171132,
      "data": {
        "object": {
          "id": "pi_3RG1vsPJSOllkrGg1t3iTPtc",
          "object": "payment_intent",
          "amount": 54400,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG1vsPJSOllkrGg1t3iTPtc_secret_WV4n6ZpOX8UhSqfpd7JQCTwbC",
          "confirmation_method": "automatic",
          "created": 1745171132,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_YMGMx6TDgQcLQf",
        "idempotency_key": "stripe-node-retry-bf8b2e55-0c6c-407c-b7e9-ab47fc27b075"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG1vnPJSOllkrGg1Bkpe5kf",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171127,
      "data": {
        "object": {
          "id": "pi_3RG1vnPJSOllkrGg14NOU1uO",
          "object": "payment_intent",
          "amount": 54400,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG1vnPJSOllkrGg14NOU1uO_secret_9ERfQMl0Bn1vFUvUMfqoZJXPW",
          "confirmation_method": "automatic",
          "created": 1745171127,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_VNSscRkIdUCJMp",
        "idempotency_key": "stripe-node-retry-b9153f43-565e-40af-a178-2f3b27d79e90"
      },
      "type": "payment_intent.created"
    },
    {
      "id": "evt_3RG1v5PJSOllkrGg1v465nvu",
      "object": "event",
      "api_version": "2025-02-24.acacia",
      "created": 1745171083,
      "data": {
        "object": {
          "id": "pi_3RG1v5PJSOllkrGg1jIz8fp4",
          "object": "payment_intent",
          "amount": 54400,
          "amount_capturable": 0,
          "amount_details": {
            "tip": {}
          },
          "amount_received": 0,
          "application": null,
          "application_fee_amount": null,
          "automatic_payment_methods": {
            "allow_redirects": "always",
            "enabled": true
          },
          "canceled_at": null,
          "cancellation_reason": null,
          "capture_method": "automatic",
          "client_secret": "pi_3RG1v5PJSOllkrGg1jIz8fp4_secret_4mTUAjSmSvsT5MqqxG7MsIwaR",
          "confirmation_method": "automatic",
          "created": 1745171083,
          "currency": "usd",
          "customer": null,
          "description": null,
          "invoice": null,
          "last_payment_error": null,
          "latest_charge": null,
          "livemode": false,
          "metadata": {
            "cartId": "qZi8C9PU2YXR2Em49NH8",
            "userId": "gGIa2ikYiwTwD8gDSuKqY7iTTEc2"
          },
          "next_action": null,
          "on_behalf_of": null,
          "payment_method": null,
          "payment_method_configuration_details": {
            "id": "pmc_1R42iAPJSOllkrGg7pULKufR",
            "parent": null
          },
          "payment_method_options": {
            "affirm": {},
            "amazon_pay": {
              "express_checkout_element_session_id": null
            },
            "card": {
              "installments": null,
              "mandate_options": null,
              "network": null,
              "request_three_d_secure": "automatic"
            },
            "cashapp": {},
            "klarna": {
              "preferred_locale": null
            },
            "link": {
              "persistent_token": null
            }
          },
          "payment_method_types": [
            "card",
            "klarna",
            "link",
            "affirm",
            "cashapp",
            "amazon_pay"
          ],
          "processing": null,
          "receipt_email": null,
          "review": null,
          "setup_future_usage": null,
          "shipping": null,
          "source": null,
          "statement_descriptor": null,
          "statement_descriptor_suffix": null,
          "status": "requires_payment_method",
          "transfer_data": null,
          "transfer_group": null
        }
      },
      "livemode": false,
      "pending_webhooks": 0,
      "request": {
        "id": "req_7Ux7Qsf9ipinb8",
        "idempotency_key": "stripe-node-retry-e7c11c64-4457-4844-8fb7-5b9e1d6d40bc"
      },
      "type": "payment_intent.created"
    }
  ],
  "has_more": true,
  "url": "/v1/events"
}

robertlawless@Roberts-MacBook-Pro benchlot % 
