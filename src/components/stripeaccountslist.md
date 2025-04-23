robertlawless@Roberts-MacBook-Pro benchlot % stripe accounts list
{
  "object": "list",
  "data": [
    {
      "id": "acct_1RGhSdPOFlHSX7u0",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745330768,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+braddunbar@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [
          {
            "id": "ba_1RGhV3POFlHSX7u0Vs1mb7fv",
            "object": "bank_account",
            "account": "acct_1RGhSdPOFlHSX7u0",
            "account_holder_name": "rlawless3+braddunbar",
            "account_holder_type": "individual",
            "account_type": null,
            "available_payout_methods": ["standard", "instant"],
            "bank_name": "STRIPE TEST BANK",
            "country": "US",
            "currency": "usd",
            "default_for_currency": true,
            "fingerprint": "CV6JMxW4g3KaRsgU",
            "future_requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "last4": "6789",
            "metadata": {},
            "requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "routing_number": "110000000",
            "status": "new"
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/accounts/acct_1RGhSdPOFlHSX7u0/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGhSdPOFlHSX7u0mkKayy6R",
        "object": "person",
        "account": "acct_1RGhSdPOFlHSX7u0",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745330767,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "rlawless3+braddunbar",
        "userId": "8WR8lVvEkjZYlXDmGuc9RCBovW72"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745330766,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGY3bPQKoeNSKwa",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745294621,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+braddunbar@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGY3bPQKoeNSKwa/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGY3cPQKoeNSKwaijdBKJed",
        "object": "person",
        "account": "acct_1RGY3bPQKoeNSKwa",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745294620,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "brad dunbar",
        "userId": "8WR8lVvEkjZYlXDmGuc9RCBovW72"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745294619,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGY3BPPEKgZPwBC",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745294594,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+braddunbar@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGY3BPPEKgZPwBC/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGY3BPPEKgZPwBCozahjqfm",
        "object": "person",
        "account": "acct_1RGY3BPPEKgZPwBC",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745294594,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "brad dunbar",
        "userId": "8WR8lVvEkjZYlXDmGuc9RCBovW72"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745294593,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGXvoPF3ql2s86H",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745294138,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+braddunbar@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGXvoPF3ql2s86H/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGXvpPF3ql2s86HcjgxfPKV",
        "object": "person",
        "account": "acct_1RGXvoPF3ql2s86H",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745294137,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "brad dunbar",
        "userId": "8WR8lVvEkjZYlXDmGuc9RCBovW72"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745294136,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGXsGPSmHcTrAbR",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745293918,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+braddunbar@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGXsGPSmHcTrAbR/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGXsGPSmHcTrAbRvVzYFiKC",
        "object": "person",
        "account": "acct_1RGXsGPSmHcTrAbR",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745293917,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "brad dunbar",
        "userId": "8WR8lVvEkjZYlXDmGuc9RCBovW72"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745293916,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGXL2PIWE8JZreI",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745291857,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+1@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [
          {
            "id": "ba_1RGXLOPIWE8JZreIYdCy7bLZ",
            "object": "bank_account",
            "account": "acct_1RGXL2PIWE8JZreI",
            "account_holder_name": "robb llawless",
            "account_holder_type": "individual",
            "account_type": null,
            "available_payout_methods": ["standard", "instant"],
            "bank_name": "STRIPE TEST BANK",
            "country": "US",
            "currency": "usd",
            "default_for_currency": true,
            "fingerprint": "CV6JMxW4g3KaRsgU",
            "future_requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "last4": "6789",
            "metadata": {},
            "requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "routing_number": "110000000",
            "status": "new"
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/accounts/acct_1RGXL2PIWE8JZreI/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGXL2PIWE8JZreIx7OXPx5I",
        "object": "person",
        "account": "acct_1RGXL2PIWE8JZreI",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745291857,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "robb llawless",
        "userId": "Z9IVfJwwysSbuoaupP3dUNYhKqC2"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745291856,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGX4RPAEgirkfis",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745290828,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+jiminycrickets@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [
          {
            "id": "ba_1RGX4xPAEgirkfisOBoebuje",
            "object": "bank_account",
            "account": "acct_1RGX4RPAEgirkfis",
            "account_holder_name": "rlawless3+jiminycrickets",
            "account_holder_type": "individual",
            "account_type": null,
            "available_payout_methods": ["standard", "instant"],
            "bank_name": "STRIPE TEST BANK",
            "country": "US",
            "currency": "usd",
            "default_for_currency": true,
            "fingerprint": "CV6JMxW4g3KaRsgU",
            "future_requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "last4": "6789",
            "metadata": {},
            "requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "routing_number": "110000000",
            "status": "new"
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/accounts/acct_1RGX4RPAEgirkfis/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGX4RPAEgirkfisbXrX3QpI",
        "object": "person",
        "account": "acct_1RGX4RPAEgirkfis",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745290827,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "rlawless3+jiminycrickets",
        "userId": "aO946rcMbDfRKHpQda2ZxBmK13m2"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745290826,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGX3LAcG7ynr0f6",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745290761,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+jiminycrickets@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGX3LAcG7ynr0f6/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGX3LAcG7ynr0f6PKHGmiyO",
        "object": "person",
        "account": "acct_1RGX3LAcG7ynr0f6",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745290760,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "Jiminy crickets",
        "userId": "aO946rcMbDfRKHpQda2ZxBmK13m2"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745290759,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGX2iPTQS8hnQJu",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745290721,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+jiminycrickets@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/accounts/acct_1RGX2iPTQS8hnQJu/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGX2iPTQS8hnQJuYKJqLP5B",
        "object": "person",
        "account": "acct_1RGX2iPTQS8hnQJu",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745290720,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "Jiminy crickets",
        "userId": "aO946rcMbDfRKHpQda2ZxBmK13m2"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "external_account",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "external_account",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745290719,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    },
    {
      "id": "acct_1RGWOwPNe8JEAl1j",
      "object": "account",
      "business_profile": {
        "annual_revenue": null,
        "estimated_worker_count": null,
        "mcc": null,
        "minority_owned_business_designation": null,
        "name": null,
        "product_description": null,
        "support_address": null,
        "support_email": null,
        "support_phone": null,
        "support_url": null,
        "url": null
      },
      "business_type": "individual",
      "capabilities": {
        "transfers": "inactive"
      },
      "charges_enabled": false,
      "company": {
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "directors_provided": true,
        "executives_provided": true,
        "name": null,
        "owners_provided": true,
        "tax_id_provided": false,
        "verification": {
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          }
        }
      },
      "controller": {
        "fees": {
          "payer": "application_custom"
        },
        "is_controller": true,
        "losses": {
          "payments": "application"
        },
        "requirement_collection": "application",
        "stripe_dashboard": {
          "type": "none"
        },
        "type": "application"
      },
      "country": "US",
      "created": 1745288255,
      "default_currency": "usd",
      "details_submitted": false,
      "email": "rlawless3+dooperdawg@gmail.com",
      "external_accounts": {
        "object": "list",
        "data": [
          {
            "id": "ba_1RGWe5PNe8JEAl1jXukOvc2b",
            "object": "bank_account",
            "account": "acct_1RGWOwPNe8JEAl1j",
            "account_holder_name": "rlawless3+dooperdawg",
            "account_holder_type": "individual",
            "account_type": null,
            "available_payout_methods": ["standard", "instant"],
            "bank_name": "STRIPE TEST BANK",
            "country": "US",
            "currency": "usd",
            "default_for_currency": true,
            "fingerprint": "CV6JMxW4g3KaRsgU",
            "future_requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "last4": "6789",
            "metadata": {},
            "requirements": {
              "currently_due": [],
              "errors": [],
              "past_due": [],
              "pending_verification": []
            },
            "routing_number": "110000000",
            "status": "new"
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/accounts/acct_1RGWOwPNe8JEAl1j/external_accounts"
      },
      "future_requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [],
        "disabled_reason": null,
        "errors": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      },
      "individual": {
        "id": "person_1RGWOwPNe8JEAl1jXvlvW2ik",
        "object": "person",
        "account": "acct_1RGWOwPNe8JEAl1j",
        "address": {
          "city": null,
          "country": "US",
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "created": 1745288254,
        "dob": {
          "day": null,
          "month": null,
          "year": null
        },
        "first_name": null,
        "future_requirements": {
          "alternatives": [],
          "currently_due": [],
          "errors": [],
          "eventually_due": [],
          "past_due": [],
          "pending_verification": []
        },
        "id_number_provided": false,
        "last_name": null,
        "metadata": {},
        "relationship": {
          "authorizer": false,
          "director": false,
          "executive": false,
          "legal_guardian": false,
          "owner": false,
          "percent_ownership": null,
          "representative": true,
          "title": null
        },
        "requirements": {
          "alternatives": [],
          "currently_due": ["first_name", "last_name"],
          "errors": [],
          "eventually_due": [
            "dob.day",
            "dob.month",
            "dob.year",
            "first_name",
            "last_name",
            "ssn_last_4"
          ],
          "past_due": ["first_name", "last_name"],
          "pending_verification": []
        },
        "ssn_last_4_provided": false,
        "verification": {
          "additional_document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "details": null,
          "details_code": null,
          "document": {
            "back": null,
            "details": null,
            "details_code": null,
            "front": null
          },
          "status": "unverified"
        }
      },
      "metadata": {
        "location": "Boston, MA",
        "purpose": "destination_only",
        "sellerName": "rlawless3+dooperdawg",
        "userId": "MR4zSxzTOcYpkMfBa4sMKjKKhKe2"
      },
      "payouts_enabled": false,
      "requirements": {
        "alternatives": [],
        "current_deadline": null,
        "currently_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "disabled_reason": "requirements.past_due",
        "errors": [],
        "eventually_due": [
          "business_profile.url",
          "individual.dob.day",
          "individual.dob.month",
          "individual.dob.year",
          "individual.first_name",
          "individual.last_name",
          "individual.ssn_last_4"
        ],
        "past_due": [
          "business_profile.url",
          "individual.first_name",
          "individual.last_name"
        ],
        "pending_verification": []
      },
      "settings": {
        "bacs_debit_payments": {
          "display_name": null,
          "service_user_number": null
        },
        "branding": {
          "icon": null,
          "logo": null,
          "primary_color": null,
          "secondary_color": null
        },
        "card_issuing": {
          "tos_acceptance": {
            "date": null,
            "ip": null
          }
        },
        "card_payments": {
          "decline_on": {
            "avs_failure": false,
            "cvc_failure": false
          },
          "statement_descriptor_prefix": null,
          "statement_descriptor_prefix_kana": null,
          "statement_descriptor_prefix_kanji": null
        },
        "dashboard": {
          "display_name": null,
          "timezone": "Etc/UTC"
        },
        "invoices": {
          "default_account_tax_ids": null,
          "hosted_payment_method_save": "always"
        },
        "payments": {
          "statement_descriptor": null,
          "statement_descriptor_kana": null,
          "statement_descriptor_kanji": null
        },
        "payouts": {
          "debit_negative_balances": false,
          "schedule": {
            "delay_days": 2,
            "interval": "manual"
          },
          "statement_descriptor": null
        },
        "sepa_debit_payments": {}
      },
      "tos_acceptance": {
        "date": 1745288254,
        "ip": "::ffff:169.254.169.126",
        "user_agent": null
      },
      "type": "custom"
    }
  ],
  "has_more": true,
  "url": "/v1/accounts"
}

