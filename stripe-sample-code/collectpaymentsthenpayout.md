---
title: Collect payments then pay out
subtitle: Collect payments from customers and pay them out to sellers or service providers.
route: /connect/collect-then-transfer-guide
---

# Collect payments then pay out

Collect payments from customers and pay them out to sellers or service providers.

# Web

> This is a Web for when platform is web. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=web.

This guide explains how to accept payments and move funds to the bank accounts of your service providers or sellers. For demonstration purposes, we’ll build a home-rental marketplace that connects homeowners to potential tenants. We’ll also show you how to accept payments from tenants (customers) and pay out homeowners (your platform’s users).

## Prerequisites

## Set up Stripe

Install Stripe’s official libraries to access the API from your application:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

## Create a connected account

When a user (seller or service provider) signs up on your marketplace, you must create a corresponding user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_). You can’t accept payments and move funds to the bank account of your user without a connected account. Connected accounts represent your users in the Stripe API and collect the information required to verify the user’s identity. In our home-rental example, the connected account represents the homeowner.

### Create a connected account and prefill information 

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Create an account link 

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Redirect your user to the account link URL 

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and are single-use only, because they grant access to the connected account user’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link, you can’t read or write information for the connected account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

### Handle the user returning to your platform 

Connect Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user is redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user.

You can use HTTP for your `return_url` and `refresh_url` while in you’re in a testing environment (for example, to test with localhost), but live mode only accepts HTTPS. Be sure to swap testing URLs for HTTPS URLs before going live.

#### return_url

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This doesn’t mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` webhooks
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url

Stripe redirects your user to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created).
- The user already visited the URL (the user refreshed the page or clicked back or forward in the browser).
- Your platform is no longer able to access the account.
- The account has been rejected.

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Handle users that haven’t completed onboarding 

A user that’s redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account isn’t fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Enable payment methods

View your [payment methods settings](https://dashboard.stripe.com/settings/payment_methods) and enable the payment methods you want to support. Card payments, Google Pay, and Apple Pay are enabled by default but you can enable and disable payment methods as needed.

Before the payment form is displayed, Stripe evaluates the currency, payment method restrictions, and other parameters to determine the list of supported payment methods. Payment methods that increase conversion and that are most relevant to the currency and customer’s location are prioritized. Lower priority payment methods are hidden in an overflow menu.

## Accept a payment

Use [Stripe Checkout](https://stripe.com/payments/checkout) to accept payments. Checkout supports multiple payment methods and automatically shows the most relevant ones to your customer.
You can accept payments with Checkout using a Stripe-hosted page or add a prebuilt embeddable payment form directly in your website.
You can also create a custom flow (using Payment Element) to accept multiple payment methods with a single front-end integration.

### Create a Checkout Session  

A Checkout Session controls what your customer sees in the Stripe-hosted payment page such as line items, the order amount and currency, and acceptable payment methods.

Add a checkout button to your website that calls a server-side endpoint to create a Checkout Session.

```html
<html>
  <head>
    <title>Checkout</title>
  </head>
  <body>
    <form action="/create-checkout-session" method="POST">
      <button type="submit">Checkout</button>
    </form>
  </body>
</html>
```

On your server, make the following call to Stripe’s API. After creating a Checkout Session, redirect your customer to the [URL](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-url) returned in the response.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    Mode = "payment",
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions { Price = "<<price>>", Quantity = 1 },
    },
    PaymentIntentData = new Stripe.Checkout.SessionPaymentIntentDataOptions
    {
        ApplicationFeeAmount = 123,
        TransferData = new Stripe.Checkout.SessionPaymentIntentDataTransferDataOptions
        {
            Destination = "<<connectedAccount>>",
        },
    },
    SuccessUrl = "https://example.com/success",
    CancelUrl = "https://example.com/cancel",
};
var service = new Stripe.Checkout.SessionService();
Stripe.Checkout.Session session = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      Price: stripe.String("<<price>>"),
      Quantity: stripe.Int64(1),
    },
  },
  PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
    ApplicationFeeAmount: stripe.Int64(123),
    TransferData: &stripe.CheckoutSessionPaymentIntentDataTransferDataParams{
      Destination: stripe.String("<<connectedAccount>>"),
    },
  },
  SuccessURL: stripe.String("https://example.com/success"),
  CancelURL: stripe.String("https://example.com/cancel"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .addLineItem(
      SessionCreateParams.LineItem.builder().setPrice("<<price>>").setQuantity(1L).build()
    )
    .setPaymentIntentData(
      SessionCreateParams.PaymentIntentData.builder()
        .setApplicationFeeAmount(123L)
        .setTransferData(
          SessionCreateParams.PaymentIntentData.TransferData.builder()
            .setDestination("<<connectedAccount>>")
            .build()
        )
        .build()
    )
    .setSuccessUrl("https://example.com/success")
    .setCancelUrl("https://example.com/cancel")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: 123,
    transfer_data: {
      destination: '<<connectedAccount>>',
    },
  },
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

session = stripe.checkout.Session.create(
  mode="payment",
  line_items=[{"price": "<<price>>", "quantity": 1}],
  payment_intent_data={
    "application_fee_amount": 123,
    "transfer_data": {"destination": "<<connectedAccount>>"},
  },
  success_url="https://example.com/success",
  cancel_url="https://example.com/cancel",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$session = $stripe->checkout->sessions->create([
  'mode' => 'payment',
  'line_items' => [
    [
      'price' => '<<price>>',
      'quantity' => 1,
    ],
  ],
  'payment_intent_data' => [
    'application_fee_amount' => 123,
    'transfer_data' => ['destination' => '<<connectedAccount>>'],
  ],
  'success_url' => 'https://example.com/success',
  'cancel_url' => 'https://example.com/cancel',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

session = Stripe::Checkout::Session.create({
  mode: 'payment',
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: 123,
    transfer_data: {destination: '<<connectedAccount>>'},
  },
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
})
```

* `line_items` - This argument represents the items the customer is purchasing. The items are displayed in the Stripe-hosted user interface.
* `success_url` - This argument redirects a user after they complete a payment.
* `cancel_url`  - This argument redirects a user after they click cancel.
* `payment_intent_data[application_fee_amount]` - This argument specifies the amount your platform plans to take from the transaction. The full charge amount is immediately transferred from the platform to the connected account that’s specified by `transfer_data[destination]` after the charge is captured. The `application_fee_amount` is then transferred back to the platform, and the Stripe fee is deducted from the platform’s amount.
* `payment_intent_data[transfer_data][destination]` - This argument indicates that this is a [destination charge](https://docs.stripe.com/connect/destination-charges.md). A destination charge means the charge is processed on the platform and then the funds are immediately and automatically transferred to the connected account’s pending balance. For our home-rental example, we want to build an experience where the customer pays through the platform and the homeowner gets paid by the platform.

![](images/connect/application_fee_amount.svg)

Checkout uses the brand settings of your platform account for destination charges. For more information, see [Customize branding](https://docs.stripe.com/connect/destination-charges.md?platform=web&ui=stripe-hosted#branding).

This Session creates a destination charge. If you need to control the timing of transfers or need to transfer funds from a single payment to multiple parties, use separate charges and transfers instead. To use separate charges, see [Enable other businesses to accept payments directly](https://docs.stripe.com/connect/enable-payment-acceptance-guide.md?platform=web).

### Handle post-payment events  

Stripe sends a [checkout.session.completed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.completed) event when the payment completes. [Use a webhook to receive these events](https://docs.stripe.com/webhooks/quickstart.md) and run actions, like sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes. Some payment methods also take 2-14 days for payment confirmation. Setting up your integration to listen for asynchronous events enables you to accept multiple [payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `checkout.session.completed` event, we recommend handling two other events when collecting payments with Checkout:

| Event                                                                                                                                        | Description                                                                           | Next steps                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [checkout.session.completed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.completed)                             | The customer has successfully authorized the payment by submitting the Checkout form. | Wait for the payment to succeed or fail.                                    |
| [checkout.session.async_payment_succeeded](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.async_payment_succeeded) | The customer’s payment succeeded.                                                     | Fulfill the purchased goods or services.                                    |
| [checkout.session.async_payment_failed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.async_payment_failed)       | The payment was declined, or failed for some other reason.                            | Contact the customer through email and request that they place a new order. |

These events all include the [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) object. After the payment succeeds, the underlying *PaymentIntent* status changes from `processing` to `succeeded`.

### Create a Checkout Session  

A Checkout Session controls what your customer sees in the embedded payment form such as line items, the order amount and currency, and acceptable payment methods.

On your server, make the following call to Stripe’s API.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    Mode = "payment",
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions { Price = "<<price>>", Quantity = 1 },
    },
    PaymentIntentData = new Stripe.Checkout.SessionPaymentIntentDataOptions
    {
        ApplicationFeeAmount = 123,
        TransferData = new Stripe.Checkout.SessionPaymentIntentDataTransferDataOptions
        {
            Destination = "<<connectedAccount>>",
        },
    },
    UiMode = "embedded",
    ReturnUrl = "https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
};
var service = new Stripe.Checkout.SessionService();
Stripe.Checkout.Session session = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      Price: stripe.String("<<price>>"),
      Quantity: stripe.Int64(1),
    },
  },
  PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
    ApplicationFeeAmount: stripe.Int64(123),
    TransferData: &stripe.CheckoutSessionPaymentIntentDataTransferDataParams{
      Destination: stripe.String("<<connectedAccount>>"),
    },
  },
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeEmbedded)),
  ReturnURL: stripe.String("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .addLineItem(
      SessionCreateParams.LineItem.builder().setPrice("<<price>>").setQuantity(1L).build()
    )
    .setPaymentIntentData(
      SessionCreateParams.PaymentIntentData.builder()
        .setApplicationFeeAmount(123L)
        .setTransferData(
          SessionCreateParams.PaymentIntentData.TransferData.builder()
            .setDestination("<<connectedAccount>>")
            .build()
        )
        .build()
    )
    .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
    .setReturnUrl("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: 123,
    transfer_data: {
      destination: '<<connectedAccount>>',
    },
  },
  ui_mode: 'embedded',
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

session = stripe.checkout.Session.create(
  mode="payment",
  line_items=[{"price": "<<price>>", "quantity": 1}],
  payment_intent_data={
    "application_fee_amount": 123,
    "transfer_data": {"destination": "<<connectedAccount>>"},
  },
  ui_mode="embedded",
  return_url="https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$session = $stripe->checkout->sessions->create([
  'mode' => 'payment',
  'line_items' => [
    [
      'price' => '<<price>>',
      'quantity' => 1,
    ],
  ],
  'payment_intent_data' => [
    'application_fee_amount' => 123,
    'transfer_data' => ['destination' => '<<connectedAccount>>'],
  ],
  'ui_mode' => 'embedded',
  'return_url' => 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

session = Stripe::Checkout::Session.create({
  mode: 'payment',
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: 123,
    transfer_data: {destination: '<<connectedAccount>>'},
  },
  ui_mode: 'embedded',
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
})
```

* `line_items` - The items the customer is purchasing. Displayed in the Stripe-hosted user interface.
* `return_url` - This argument redirects a user after they complete a payment attempt.
* `payment_intent_data[application_fee_amount]` - This argument specifies the amount your platform plans to take from the transaction. The full charge amount is immediately transferred from the platform to the connected account that’s specified by `transfer_data[destination]` after the charge is captured. The `application_fee_amount` is then transferred back to the platform, and the Stripe fee is deducted from the platform’s amount.
* `payment_intent_data[transfer_data][destination]` - Indicates that this is a [destination charge](https://docs.stripe.com/connect/destination-charges.md), which means the charge is processed on the platform. Then the funds are immediately and automatically transferred to the connected account’s pending balance. In the home rental example, if a customer pays through the platform the homeowner gets paid by the platform.

### Mount Checkout  

Checkout is available as part of [Stripe.js](https://docs.stripe.com/js). Include the Stripe.js script on your page by adding it to the head of your HTML file. Next, create an empty DOM node (container) to use for mounting.

```html
<head>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <div id="checkout">
    <!-- Checkout will insert the payment form here -->
  </div>
</body>
```

Initialize Stripe.js with your publishable API key.

Create an asynchronous `fetchClientSecret` function that makes a request to your server to create the Checkout Session and retrieve the client secret. Pass this function into `options` when you create the Checkout instance:

```javascript
// Initialize Stripe.js

initialize();

// Fetch Checkout Session and retrieve the client secret
async function initialize() {
  const fetchClientSecret = async () => {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
    });
    const { clientSecret } = await response.json();
    return clientSecret;
  };

  // Initialize Checkout
  const checkout = await stripe.initEmbeddedCheckout({
    fetchClientSecret,
  });

  // Mount Checkout
  checkout.mount('#checkout');
}
```

Install Connect.js and the React Connect.js libraries from the [npm public registry](https://www.npmjs.com/package/@stripe/react-connect-js).

```bash
npm install --save @stripe/connect-js @stripe/react-connect-js
```

To use the Embedded Checkout component, create an `EmbeddedCheckoutProvider`. Call `loadStripe` with your publishable API key and pass the returned `Promise` to the provider.

Create an asynchronous `fetchClientSecret` function that makes a request to your server to create the Checkout Session and retrieve the client secret. Pass this function into the `options` prop accepted by the provider.

```jsx
import * as React from 'react';
import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe('pk_test_123');

const App = ({fetchClientSecret}) => {
  const options = {fetchClientSecret};

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={options}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}
```

Checkout is rendered in an iframe that securely sends payment information to Stripe over an HTTPS connection. Avoid placing Checkout within another iframe because some payment methods require redirecting to another page for payment confirmation.

![](images/connect/application_fee_amount.svg)

Checkout uses the brand settings of your platform account for destination charges. For more information, see [Customize branding](https://docs.stripe.com/connect/destination-charges.md?platform=web&ui=stripe-hosted#branding).

This Session creates a destination charge. If you need to control the timing of transfers or need to transfer funds from a single payment to multiple parties, use separate charges and transfers instead. To use separate charges, see [Enable other businesses to accept payments directly](https://docs.stripe.com/connect/enable-payment-acceptance-guide.md?platform=web).

### Handle post-payment events  

Stripe sends a [checkout.session.completed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.completed) event when the payment completes. [Use a webhook to receive these events](https://docs.stripe.com/webhooks/quickstart.md) and run actions, like sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes. Some payment methods also take 2-14 days for payment confirmation. Setting up your integration to listen for asynchronous events enables you to accept multiple [payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `checkout.session.completed` event, we recommend handling two other events when collecting payments with Checkout:

| Event                                                                                                                                        | Description                                                                           | Next steps                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [checkout.session.completed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.completed)                             | The customer has successfully authorized the payment by submitting the Checkout form. | Wait for the payment to succeed or fail.                                    |
| [checkout.session.async_payment_succeeded](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.async_payment_succeeded) | The customer’s payment succeeded.                                                     | Fulfill the purchased goods or services.                                    |
| [checkout.session.async_payment_failed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.async_payment_failed)       | The payment was declined, or failed for some other reason.                            | Contact the customer through email and request that they place a new order. |

These events all include the [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) object. After the payment succeeds, the underlying *PaymentIntent* status changes from `processing` to `succeeded`.

### Create a PaymentIntent  

Stripe uses a [PaymentIntent](https://docs.stripe.com/api/payment_intents.md) object to represent your intent to collect payment from a customer, tracking charge attempts and payment state changes throughout the process.

If you want to render the Payment Element without first creating a PaymentIntent, see [Collect payment details before creating an Intent](https://docs.stripe.com/payments/accept-a-payment-deferred.md?type=payment).

![An overview diagram of the entire payment flow](images/stripejs/accept-a-payment-payment-element.svg)

The payment methods shown to customers during the checkout process are also included on the PaymentIntent. You can let Stripe automatically pull payment methods from your Dashboard settings or you can list them manually.

Unless your integration requires a code-based option for offering payment methods, Stripe recommends the automated option. This is because Stripe evaluates the currency, payment method restrictions, and other parameters to determine the list of supported payment methods. Payment methods that increase conversion and that are most relevant to the currency and customer’s location are prioritized. Lower priority payment methods are hidden in an overflow menu.

Create a PaymentIntent on your server with an amount and currency enabled. In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default. You can manage payment methods from the [Dashboard](https://dashboard.stripe.com/settings/payment_methods). Stripe handles the return of eligible payment methods based on factors such as the transaction’s amount, currency, and payment flow. The PaymentIntent is created to support the payment methods that you configure in the Dashboard, as applicable. Always decide how much to charge on the server side (a trusted environment) as opposed to the client. This prevents malicious customers from being able to choose their own prices.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new PaymentIntentCreateOptions
{
    Amount = 1099,
    Currency = "eur",
    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true },
    ApplicationFeeAmount = 123,
    TransferData = new PaymentIntentTransferDataOptions { Destination = "<<connectedAccount>>" },
};
var service = new PaymentIntentService();
PaymentIntent paymentIntent = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.PaymentIntentParams{
  Amount: stripe.Int64(1099),
  Currency: stripe.String(string(stripe.CurrencyEUR)),
  AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
    Enabled: stripe.Bool(true),
  },
  ApplicationFeeAmount: stripe.Int64(123),
  TransferData: &stripe.PaymentIntentTransferDataParams{
    Destination: stripe.String("<<connectedAccount>>"),
  },
};
result, err := paymentintent.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

PaymentIntentCreateParams params =
  PaymentIntentCreateParams.builder()
    .setAmount(1099L)
    .setCurrency("eur")
    .setAutomaticPaymentMethods(
      PaymentIntentCreateParams.AutomaticPaymentMethods.builder().setEnabled(true).build()
    )
    .setApplicationFeeAmount(123L)
    .setTransferData(
      PaymentIntentCreateParams.TransferData.builder()
        .setDestination("<<connectedAccount>>")
        .build()
    )
    .build();

PaymentIntent paymentIntent = PaymentIntent.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const paymentIntent = await stripe.paymentIntents.create({
  amount: 1099,
  currency: 'eur',
  automatic_payment_methods: {
    enabled: true,
  },
  application_fee_amount: 123,
  transfer_data: {
    destination: '<<connectedAccount>>',
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

payment_intent = stripe.PaymentIntent.create(
  amount=1099,
  currency="eur",
  automatic_payment_methods={"enabled": True},
  application_fee_amount=123,
  transfer_data={"destination": "<<connectedAccount>>"},
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$paymentIntent = $stripe->paymentIntents->create([
  'amount' => 1099,
  'currency' => 'eur',
  'automatic_payment_methods' => ['enabled' => true],
  'application_fee_amount' => 123,
  'transfer_data' => ['destination' => '<<connectedAccount>>'],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

payment_intent = Stripe::PaymentIntent.create({
  amount: 1099,
  currency: 'eur',
  automatic_payment_methods: {enabled: true},
  application_fee_amount: 123,
  transfer_data: {destination: '<<connectedAccount>>'},
})
```

Create a PaymentIntent on your server with an amount, currency, and a list of payment method types. Always decide how much to charge on the server side, a trusted environment, as opposed to the client. This prevents malicious customers from being able to choose their own prices.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new PaymentIntentCreateOptions
{
    Amount = 1099,
    Currency = "eur",
    PaymentMethodTypes = new List<string>
    {
        "bancontact",
        "card",
        "eps",
        "ideal",
        "p24",
        "sepa_debit",
        "sofort",
    },
    ApplicationFeeAmount = 123,
};
var service = new PaymentIntentService();
PaymentIntent paymentIntent = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.PaymentIntentParams{
  Amount: stripe.Int64(1099),
  Currency: stripe.String(string(stripe.CurrencyEUR)),
  PaymentMethodTypes: []*string{
    stripe.String("bancontact"),
    stripe.String("card"),
    stripe.String("eps"),
    stripe.String("ideal"),
    stripe.String("p24"),
    stripe.String("sepa_debit"),
    stripe.String("sofort"),
  },
  ApplicationFeeAmount: stripe.Int64(123),
};
result, err := paymentintent.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

PaymentIntentCreateParams params =
  PaymentIntentCreateParams.builder()
    .setAmount(1099L)
    .setCurrency("eur")
    .addPaymentMethodType("bancontact")
    .addPaymentMethodType("card")
    .addPaymentMethodType("eps")
    .addPaymentMethodType("ideal")
    .addPaymentMethodType("p24")
    .addPaymentMethodType("sepa_debit")
    .addPaymentMethodType("sofort")
    .setApplicationFeeAmount(123L)
    .build();

PaymentIntent paymentIntent = PaymentIntent.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const paymentIntent = await stripe.paymentIntents.create({
  amount: 1099,
  currency: 'eur',
  payment_method_types: ['bancontact', 'card', 'eps', 'ideal', 'p24', 'sepa_debit', 'sofort'],
  application_fee_amount: 123,
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

payment_intent = stripe.PaymentIntent.create(
  amount=1099,
  currency="eur",
  payment_method_types=["bancontact", "card", "eps", "ideal", "p24", "sepa_debit", "sofort"],
  application_fee_amount=123,
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$paymentIntent = $stripe->paymentIntents->create([
  'amount' => 1099,
  'currency' => 'eur',
  'payment_method_types' => ['bancontact', 'card', 'eps', 'ideal', 'p24', 'sepa_debit', 'sofort'],
  'application_fee_amount' => 123,
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

payment_intent = Stripe::PaymentIntent.create({
  amount: 1099,
  currency: 'eur',
  payment_method_types: ['bancontact', 'card', 'eps', 'ideal', 'p24', 'sepa_debit', 'sofort'],
  application_fee_amount: 123,
})
```

Choose the currency based on the payment methods you want to offer. Some payment methods support multiple currencies and countries. This guide uses Bancontact, credit cards, EPS, iDEAL, Przelewy24, and SEPA Direct Debit, and Sofort.

Each payment method needs to support the currency passed in the PaymentIntent and your business needs to be based in one of the countries each payment method supports. See [Payment method integration options](https://docs.stripe.com/payments/payment-methods/integration-options.md) for more details about what’s supported.

### Retrieve the client secret

The {{intentKind}} includes a *client secret* that the client side uses to securely complete the payment process. You can use different approaches to pass the client secret to the client side.

Retrieve the client secret from an endpoint on your server, using the browser’s `fetch` function. This approach is best if your client side is a single-page application, particularly one built with a modern frontend framework like React. Create the server endpoint that serves the client secret:

```ruby
get '/secret' do
  intent = # ... Create or retrieve the {{intentKind}}
  {client_secret: intent.client_secret}.to_json
end
```

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/secret')
def secret():
  intent = # ... Create or retrieve the {{intentKind}}
  return jsonify(client_secret=intent.client_secret)
```

```php
<?php
    $intent = # ... Create or retrieve the {{intentKind}}
    echo json_encode(array('client_secret' => $intent->client_secret));
?>
```

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.{{intentKind}};

import com.google.gson.Gson;

import static spark.Spark.get;

public class StripeJavaQuickStart {
  public static void main(String[] args) {
    Gson gson = new Gson();

    get("/secret", (request, response) -> {
      {{intentKind}} intent = // ... Fetch or create the {{intentKind}}

      Map<String, String> map = new HashMap();
      map.put("client_secret", intent.getClientSecret());

      return map;
    }, gson::toJson);
  }
}
```

```javascript
const express = require('express');
const app = express();

app.get('/secret', async (req, res) => {
  const intent = // ... Fetch or create the {{intentKind}}
  res.json({client_secret: intent.client_secret});
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

```go
package main

import (
  "encoding/json"
  "net/http"

  stripe "github.com/stripe/stripe-go/v{{golang.major_version}}"
)

type CheckoutData struct {
  ClientSecret string `json:"client_secret"`
}

func main() {
  http.HandleFunc("/secret", func(w http.ResponseWriter, r *http.Request) {
    intent := // ... Fetch or create the {{intentKind}}
    data := CheckoutData{
      ClientSecret: intent.ClientSecret,
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(data)
  })

  http.ListenAndServe(":3000", nil)
}
```

```csharp
using System;
using Microsoft.AspNetCore.Mvc;
using Stripe;

namespace StripeExampleApi.Controllers
{
  [Route("secret")]
  [ApiController]
  public class CheckoutApiController : Controller
  {
    [HttpGet]
    public ActionResult Get()
    {
      var intent = // ... Fetch or create the {{intentKind}}
      return Json(new {client_secret = intent.ClientSecret});
    }
  }
}
```

And then fetch the client secret with JavaScript on the client side:

```javascript
(async () => {
  const response = await fetch('/secret');
  const {client_secret: clientSecret} = await response.json();
  // Render the form using the clientSecret
})();
```

Pass the client secret to the client from your server. This approach works best if your application generates static content on the server before sending it to the browser.

```erb
<form id="payment-form" data-secret="<%= @intent.client_secret %>">
  <button id="submit">Submit</button>
</form>
```

```ruby
get '/checkout' do
  @intent = # ... Fetch or create the {{intentKind}}
  erb :checkout
end
```

```html
<form id="payment-form" data-secret="{{ client_secret }}">
  <button id="submit">Submit</button>
</form>
```

```python
@app.route('/checkout')
def checkout():
  intent = # ... Fetch or create the {{intentKind}}
  return render_template('checkout.html', client_secret=intent.client_secret)
```

```php
<?php
  $intent = # ... Fetch or create the {{intentKind}};
?>
...
<form id="payment-form" data-secret="<?= $intent->client_secret ?>">
  <button id="submit">Submit</button>
</form>
...
```

```html
<form id="payment-form" data-secret="{{ client_secret }}">
  <button id="submit">Submit</button>
</form>
```

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.{{intentKind}};

import spark.ModelAndView;

import static spark.Spark.get;

public class StripeJavaQuickStart {
  public static void main(String[] args) {
    get("/checkout", (request, response) -> {
      {{intentKind}} intent = // ... Fetch or create the {{intentKind}}

      Map map = new HashMap();
      map.put("client_secret", intent.getClientSecret());

      return new ModelAndView(map, "checkout.hbs");
    }, new HandlebarsTemplateEngine());
  }
}
```

```html
<form id="payment-form" data-secret="{{ client_secret }}">
  <div id="payment-element">
    <!-- Elements will create form elements here -->
  </div>

  <button id="submit">Submit</button>
</form>
```

```javascript
const express = require('express');
const expressHandlebars = require('express-handlebars');
const app = express();

app.engine('.hbs', expressHandlebars({ extname: '.hbs' }));
app.set('view engine', '.hbs');
app.set('views', './views');

app.get('/checkout', async (req, res) => {
  const intent = // ... Fetch or create the {{intentKind}}
  res.render('checkout', { client_secret: intent.client_secret });
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

```html
<form id="payment-form" data-secret="{{ .ClientSecret }}">
  <button id="submit">Submit</button>
</form>
```

```go
package main

import (
  "html/template"
  "net/http"

  stripe "github.com/stripe/stripe-go/v{{golang.major_version}}"
)

type CheckoutData struct {
  ClientSecret string
}

func main() {
  checkoutTmpl := template.Must(template.ParseFiles("views/checkout.html"))

  http.HandleFunc("/checkout", func(w http.ResponseWriter, r *http.Request) {
    intent := // ... Fetch or create the {{intentKind}}
    data := CheckoutData{
      ClientSecret: intent.ClientSecret,
    }
    checkoutTmpl.Execute(w, data)
  })

  http.ListenAndServe(":3000", nil)
}
```

```html
<form id="payment-form" data-secret="@ViewData["ClientSecret"]">
  <button id="submit">Submit</button>
</form>
```

```csharp
using System;
using Microsoft.AspNetCore.Mvc;
using Stripe;

namespace StripeExampleApi.Controllers
{
  [Route("/[controller]")]
  public class CheckoutApiController : Controller
  {
    public IActionResult Index()
    {
      var intent = // ... Fetch or create the {{intentKind}}
      ViewData["ClientSecret"] = intent.ClientSecret;
      return View();
    }
  }
}
```

### Collect payment details  

Collect payment details on the client with the [Payment Element](https://docs.stripe.com/payments/payment-element.md). The Payment Element is a prebuilt UI component that simplifies collecting payment details for a variety of payment methods.

The Payment Element contains an iframe that securely sends payment information to Stripe over an HTTPS connection. Avoid placing the Payment Element within another iframe because some payment methods require redirecting to another page for payment confirmation.

The checkout page address must start with `https://` rather than `http://` for your integration to work. You can test your integration without using HTTPS, but remember to [enable it](https://docs.stripe.com/security/guide.md#tls) when you’re ready to accept live payments.

### Set up Stripe.js

The Payment Element is automatically available as a feature of Stripe.js. Include the Stripe.js script on your checkout page by adding it to the `head` of your HTML file. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. Don’t include the script in a bundle or host a copy of it yourself.

```html
<head>
  <title>Checkout</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
```

Create an instance of Stripe with the following JavaScript on your checkout page:

```javascript
// Set your publishable key: remember to change this to your live publishable key in production
// See your keys here: https://dashboard.stripe.com/apikeys
```

### Add the Payment Element to your payment page

The Payment Element needs a place to live on your payment page. Create an empty DOM node (container) with a unique ID in your payment form:

```html
<form id="payment-form">
  <div id="payment-element">
    <!-- Elements will create form elements here -->
  </div>
  <button id="submit">Submit</button>
  <div id="error-message">
    <!-- Display error message to your customers here -->
  </div>
</form>
```

When the previous form loads, create an instance of the Payment Element and mount it to the container DOM node. Pass the  from the previous step into `options` when you create the [Elements](https://docs.stripe.com/js/elements_object/create) instance:

```javascript
const options = {
  clientSecret: '{{CLIENT_SECRET}}',
  // Fully customizable with appearance API.
  appearance: {/*...*/},
};

// Set up Stripe.js and Elements to use in checkout form, passing the client secret obtained in a previous step
const elements = stripe.elements(options);

// Create and mount the Payment Element
const paymentElementOptions = { layout: 'accordion'};
const paymentElement = elements.create('payment', paymentElementOptions);
paymentElement.mount('#payment-element');

```

### Set up Stripe.js

Install [React Stripe.js](https://www.npmjs.com/package/@stripe/react-stripe-js) and the [Stripe.js loader](https://www.npmjs.com/package/@stripe/stripe-js) from the npm public registry:

```bash
npm install --save @stripe/react-stripe-js @stripe/stripe-js
```

### Add and configure the Elements provider to your payment page

To use the Payment Element component, wrap your checkout page component in an [Elements provider](https://docs.stripe.com/sdks/stripejs-react.md#elements-provider). Call `loadStripe` with your publishable key, and pass the returned `Promise` to the `Elements` provider. Also pass the [client secret](https://docs.stripe.com/api/payment_intents/object.md#payment_intent_object-client_secret) from the previous step as `options` to the `Elements` provider.

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import {Elements} from '@stripe/react-stripe-js';
import {loadStripe} from '@stripe/stripe-js';


// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.

function App() {
  const options = {
    // passing the client secret obtained in step 3
    clientSecret: '{{CLIENT_SECRET}}',
    // Fully customizable with appearance API.
    appearance: {/*...*/},
  };

  return (
    <Elements stripe={stripePromise} options={options}>
    </Elements>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
```

### Add the Payment Element component

Use the `PaymentElement` component to build your form:

### Submit the payment to Stripe  

Use [stripe.confirmPayment](https://docs.stripe.com/js/payment_intents/confirm_payment) to complete the payment using details from the Payment Element. Provide a [return_url](https://docs.stripe.com/api/payment_intents/create.md#create_payment_intent-return_url) to this function to indicate where Stripe should redirect the user after they complete the payment. Your user may be first redirected to an intermediate site, like a bank authorization page, before being redirected to the `return_url`. Card payments immediately redirect to the `return_url` when a payment is successful.

```javascript
const form = document.getElementById('payment-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const {error} = await stripe.confirmPayment({
    //`Elements` instance that was used to create the Payment Element
    elements,
    confirmParams: {
      return_url: 'https://example.com/order/123/complete',
    },
  });

  if (error) {
    // This point will only be reached if there is an immediate error when
    // confirming the payment. Show error to your customer (for example, payment
    // details incomplete)
    const messageContainer = document.querySelector('#error-message');
    messageContainer.textContent = error.message;
  } else {
    // Your customer will be redirected to your `return_url`. For some payment
    // methods like iDEAL, your customer will be redirected to an intermediate
    // site first to authorize the payment, then redirected to the `return_url`.
  }
});
```

To call [stripe.confirmPayment](https://docs.stripe.com/js/payment_intents/confirm_payment) from your payment form component, use the [useStripe](https://docs.stripe.com/sdks/stripejs-react.md#usestripe-hook) and [useElements](https://docs.stripe.com/sdks/stripejs-react.md#useelements-hook) hooks.

If you prefer traditional class components over hooks, you can instead use an [ElementsConsumer](https://docs.stripe.com/sdks/stripejs-react.md#elements-consumer).

```jsx
import React, {useState} from 'react';
import {useStripe, useElements, PaymentElement} from '@stripe/react-stripe-js';

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    const {error} = await stripe.confirmPayment({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: 'https://example.com/order/123/complete',
      },
    });


    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      setErrorMessage(error.message);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe}>Submit</button>
      {/* Show error message to your customers */}
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  )
};

export default CheckoutForm;
```

Make sure the `return_url` corresponds to a page on your website that provides the status of the payment. When Stripe redirects the customer to the `return_url`, we provide the following URL query parameters:

| Parameter                      | Description                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `payment_intent`               | The unique identifier for the `PaymentIntent`.                                                                                                |
| `payment_intent_client_secret` | The [client secret](https://docs.stripe.com/api/payment_intents/object.md#payment_intent_object-client_secret) of the `PaymentIntent` object. |

If you have tooling that tracks the customer’s browser session, you might need to add the `stripe.com` domain to the referrer exclude list. Redirects cause some tools to create new sessions, which prevents you from tracking the complete session.

Use one of the query parameters to retrieve the PaymentIntent. Inspect the [status of the PaymentIntent](https://docs.stripe.com/payments/paymentintents/lifecycle.md) to decide what to show your customers. You can also append your own query parameters when providing the `return_url`, which persist through the redirect process.

```javascript
// Initialize Stripe.js using your publishable key
const stripe = Stripe('<<publishable key>>');

// Retrieve the "payment_intent_client_secret" query parameter appended to
// your return_url by Stripe.js
const clientSecret = new URLSearchParams(window.location.search).get(
  'payment_intent_client_secret'
);

// Retrieve the PaymentIntent
stripe.retrievePaymentIntent(clientSecret).then(({paymentIntent}) => {
  const message = document.querySelector('#message')

  // Inspect the PaymentIntent `status` to indicate the status of the payment
  // to your customer.
  //
  // Some payment methods will [immediately succeed or fail][0] upon
  // confirmation, while others will first enter a `processing` state.
  //
  // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
  switch (paymentIntent.status) {
    case 'succeeded':
      message.innerText = 'Success! Payment received.';
      break;

    case 'processing':
      message.innerText = "Payment processing. We'll update you when payment is received.";
      break;

    case 'requires_payment_method':
      message.innerText = 'Payment failed. Please try another payment method.';
      // Redirect your user back to your payment page to attempt collecting
      // payment again
      break;

    default:
      message.innerText = 'Something went wrong.';
      break;
  }
});
```

```jsx
import React, {useState, useEffect} from 'react';
import {useStripe} from '@stripe/react-stripe-js';

const PaymentStatus = () => {
  const stripe = useStripe();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Retrieve the "payment_intent_client_secret" query parameter appended to
    // your return_url by Stripe.js
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    // Retrieve the PaymentIntent
    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({paymentIntent}) => {
        // Inspect the PaymentIntent `status` to indicate the status of the payment
        // to your customer.
        //
        // Some payment methods will [immediately succeed or fail][0] upon
        // confirmation, while others will first enter a `processing` state.
        //
        // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Success! Payment received.');
            break;

          case 'processing':
            setMessage("Payment processing. We'll update you when payment is received.");
            break;

          case 'requires_payment_method':
            // Redirect your user back to your payment page to attempt collecting
            // payment again
            setMessage('Payment failed. Please try another payment method.');
            break;

          default:
            setMessage('Something went wrong.');
            break;
        }
      });
  }, [stripe]);


  return message;
};

export default PaymentStatus;
```

### Handle post-payment events  

Stripe sends a [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md#event_types-payment_intent.succeeded) event when the payment completes. Use the [Dashboard webhook tool](https://dashboard.stripe.com/webhooks) or follow the [webhook guide](https://docs.stripe.com/webhooks/quickstart.md) to receive these events and run actions, such as sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes, and malicious clients could manipulate the response. Setting up your integration to listen for asynchronous events is what enables you to accept [different types of payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `payment_intent.succeeded` event, we recommend handling these other events when collecting payments with the Payment Element:

| Event                                                                                                                           | Description                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.succeeded)           | Sent when a customer successfully completes a payment.                                                                                                                                                                                                                              | Send the customer an order confirmation and *fulfill* their order.                                                                                                              |
| [payment_intent.processing](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.processing)         | Sent when a customer successfully initiates a payment, but the payment has yet to complete. This event is most commonly sent when the customer initiates a bank debit. It’s followed by either a `payment_intent.succeeded` or `payment_intent.payment_failed` event in the future. | Send the customer an order confirmation that indicates their payment is pending. For digital goods, you might want to fulfill the order before waiting for payment to complete. |
| [payment_intent.payment_failed](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.payment_failed) | Sent when a customer attempts a payment, but the payment fails.                                                                                                                                                                                                                     | If a payment transitions from `processing` to `payment_failed`, offer the customer another attempt to pay.                                                                      |

## Testing

Test your account creation flow by [creating accounts](https://docs.stripe.com/connect/testing.md#creating-accounts) and [using OAuth](https://docs.stripe.com/connect/testing.md#using-oauth).

| Card number         | Scenario                                                            | How to test                                                                                           |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4242424242424242    | The card payment succeeds and doesn’t require authentication.       | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000002500003155    | The card payment requires *authentication*.                         | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000000000009995    | The card is declined with a decline code like `insufficient_funds`. | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 6205500000000000004 | The UnionPay card has a variable length of 13-19 digits.            | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |

| Payment method | Scenario                                                                                                                                                                   | How to test                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | Your customer fails to authenticate on the redirect page for a redirect-based and immediate notification payment method.                                                   | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page. |
| Pay by Bank    | Your customer successfully pays with a redirect-based and [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method. | Choose the payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page.            |
| Pay by Bank    | Your customer fails to authenticate on the redirect page for a redirect-based and delayed notification payment method.                                                     | Choose the payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page.                |

| Payment method    | Scenario                                                                                          | How to test                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEPA Direct Debit | Your customer successfully pays with SEPA Direct Debit.                                           | Fill out the form using the account number `AT321904300235473204`. The confirmed PaymentIntent initially transitions to processing, then transitions to the succeeded status three minutes later. |
| SEPA Direct Debit | Your customer’s payment intent status transitions from `processing` to `requires_payment_method`. | Fill out the form using the account number `AT861904300235473202`.                                                                                                                                |

See [Testing](https://docs.stripe.com/testing.md) for additional information to test your integration.

# Payment sheet

> This is a Payment sheet for when platform is ios and mobile-ui is payment-element. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=ios&mobile-ui=payment-element.

This guide demonstrates how to accept payments and move funds to the bank accounts of your sellers or service providers. For demonstration purposes, we’ll build a home-rental marketplace that connects homeowners to people looking for a place to rent. You can use the concepts covered in this guide in other applications as well.

## Prerequisites

## Set up Stripe

### Server-side 

This integration requires endpoints on your server that talk to the Stripe API. Use the official libraries for access to the Stripe API from your server:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

### Client-side 

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/test/apikeys) on app start. This enables your app to make requests to the Stripe API.

Use your [test keys](https://docs.stripe.com/keys.md#obtain-api-keys) while you test and develop, and your [live mode](https://docs.stripe.com/keys.md#test-live-modes) keys when you publish your app.

## Create a connected account

When a user (seller or service provider) signs up on your platform, create a user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_) so you can accept payments and move funds to their bank account. Connected accounts represent your users in the Stripe API and help collect the information required to verify the user’s identity. In our home-rental example, the connected account represents the homeowner.

![](images/connect/express-ios.png)

This guide uses Express accounts, which have certain [restrictions](https://docs.stripe.com/connect/express-accounts.md#prerequisites-for-using-express). You can evaluate [Custom accounts](https://docs.stripe.com/connect/custom-accounts.md) as an alternative.

### Step 2.1: Create a connected account and prefill information  

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Step 2.2: Create an account link  

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Step 2.3: Redirect your user to the account link URL  

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and are single-use only, because they grant access to the connected account user’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link for an Express account, you will not be able to read or write information for the account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

```swift
import UIKit
import SafariServices

let BackendAPIBaseURL: String = "" // Set to the URL of your backend server

class ConnectOnboardViewController: UIViewController {

    // ...

    override func viewDidLoad() {
        super.viewDidLoad()

        let connectWithStripeButton = UIButton(type: .system)
        connectWithStripeButton.setTitle("Connect with Stripe", for: .normal)
        connectWithStripeButton.addTarget(self, action: #selector(didSelectConnectWithStripe), for: .touchUpInside)
        view.addSubview(connectWithStripeButton)

        // ...
    }

    @objc
    func didSelectConnectWithStripe() {
        if let url = URL(string: BackendAPIBaseURL)?.appendingPathComponent("onboard-user") {
          var request = URLRequest(url: url)
          request.httpMethod = "POST"
          let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
              guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String : Any],
                  let accountURLString = json["url"] as? String,
                  let accountURL = URL(string: accountURLString) else {
                      // handle error
              }

              let safariViewController = SFSafariViewController(url: accountURL)
              safariViewController.delegate = self

              DispatchQueue.main.async {
                  self.present(safariViewController, animated: true, completion: nil)
              }
          }
        }
    }

    // ...
}

extension ConnectOnboardViewController: SFSafariViewControllerDelegate {
    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        // the user may have closed the SFSafariViewController instance before a redirect
        // occurred. Sync with your backend to confirm the correct state
    }
}

```

```objc
\#import "ConnectOnboardViewController.h"

#import <SafariServices/SafariServices.h>

static NSString * const kBackendAPIBaseURL = @"";  // Set to the URL of your backend server

@interface ConnectOnboardViewController () <SFSafariViewControllerDelegate>
// ...
@end

@implementation ConnectOnboardViewController

// ...

- (void)viewDidLoad {
    [super viewDidLoad];

    UIButton *connectWithStripeButton = [UIButton buttonWithType:UIButtonTypeSystem];
    [connectWithStripeButton setTitle:@"Connect with Stripe" forState:UIControlStateNormal];
    [connectWithStripeButton addTarget:self action:@selector(_didSelectConnectWithStripe) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:connectWithStripeButton];

    // ...
}

- (void)_didSelectConnectWithStripe {
  NSURL *url = [NSURL URLWithString:[kBackendAPIBaseURL stringByAppendingPathComponent:@"onboard-user"]];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = @"POST";

  NSURLSessionTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
      if (data != nil) {
          NSError *jsonError = nil;
          id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];

          if (json != nil && [json isKindOfClass:[NSDictionary class]]) {
              NSDictionary *jsonDictionary = (NSDictionary *)json;
              NSURL *accountURL = [NSURL URLWithString:jsonDictionary[@"url"]];
              if (accountURL != nil) {
                  SFSafariViewController *safariViewController = [[SFSafariViewController alloc] initWithURL:accountURL];
                  safariViewController.delegate = self;

                  dispatch_async(dispatch_get_main_queue(), ^{
                      [self presentViewController:safariViewController animated:YES completion:nil];
                  });
              } else {
                  // handle  error
              }
          } else {
              // handle error
          }
      } else {
          // handle error
      }
  }];
  [task resume];
}

// ...

#pragma mark - SFSafariViewControllerDelegate
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller {
    // The user may have closed the SFSafariViewController instance before a redirect
    // occurred. Sync with your backend to confirm the correct state
}

@end

```

### Step 2.4: Handle the user returning to your platform  

*Connect* Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user is redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user. You can set up a [universal link](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content) to enable iOS to redirect to your app automatically.

#### return_url

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This does not mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` *webhooks*
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url

Stripe redirects your user to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created)
- The user already visited the URL (the user refreshed the page or clicked back or forward in the browser)
- Your platform is no longer able to access the account
- The account has been rejected

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Step 2.5: Handle users that have not completed onboarding 

A user that is redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account is not fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Enable payment methods

View your [payment methods settings](https://dashboard.stripe.com/settings/connect/payment_methods) and enable the payment methods you want to support. Card payments, Google Pay, and Apple Pay are enabled by default but you can enable and disable payment methods as needed.

Before the payment form is displayed, Stripe evaluates the currency, payment method restrictions, and other parameters to determine the list of supported payment methods. Payment methods that increase conversion and that are most relevant to the currency and customer’s location are prioritized. Lower priority payment methods are hidden in an overflow menu.

## Add an endpoint

## Integrate the payment sheet

## Set up a return URL

The customer might navigate away from your app to authenticate (for example, in Safari or their banking app). To allow them to automatically return to your app after authenticating, [configure a custom URL scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) and set up your app delegate to forward the URL to the SDK. Stripe doesn’t support [universal links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).

```swift
// This method handles opening custom URL schemes (for example, "your-app://stripe-redirect")
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else {
        return
    }
    let stripeHandled = StripeAPI.handleURLCallback(with: url)
    if (!stripeHandled) {
        // This was not a Stripe url – handle the URL normally as you would
    }
}

```

```swift
// This method handles opening custom URL schemes (for example, "your-app://stripe-redirect")
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    let stripeHandled = StripeAPI.handleURLCallback(with: url)
    if (stripeHandled) {
        return true
    } else {
        // This was not a Stripe url – handle the URL normally as you would
    }
    return false
}
```

```swift
@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      Text("Hello, world!")
        .onOpenURL { incomingURL in
          let stripeHandled = StripeAPI.handleURLCallback(with: incomingURL)
          if (!stripeHandled) {
            // This was not a Stripe url – handle the URL normally as you would
          }
        }
    }
  }
}
```

## Handle post-payment events

Stripe sends a [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md#event_types-payment_intent.succeeded) event when the payment completes. Use the [Dashboard webhook tool](https://dashboard.stripe.com/webhooks) or follow the [webhook guide](https://docs.stripe.com/webhooks/quickstart.md) to receive these events and run actions, such as sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes, and malicious clients could manipulate the response. Setting up your integration to listen for asynchronous events is what enables you to accept [different types of payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `payment_intent.succeeded` event, we recommend handling these other events when collecting payments with the Payment Element:

| Event                                                                                                                           | Description                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.succeeded)           | Sent when a customer successfully completes a payment.                                                                                                                                                                                                                              | Send the customer an order confirmation and *fulfill* their order.                                                                                                              |
| [payment_intent.processing](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.processing)         | Sent when a customer successfully initiates a payment, but the payment has yet to complete. This event is most commonly sent when the customer initiates a bank debit. It’s followed by either a `payment_intent.succeeded` or `payment_intent.payment_failed` event in the future. | Send the customer an order confirmation that indicates their payment is pending. For digital goods, you might want to fulfill the order before waiting for payment to complete. |
| [payment_intent.payment_failed](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.payment_failed) | Sent when a customer attempts a payment, but the payment fails.                                                                                                                                                                                                                     | If a payment transitions from `processing` to `payment_failed`, offer the customer another attempt to pay.                                                                      |

## Test the integration

| Card number         | Scenario                                                            | How to test                                                                                           |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4242424242424242    | The card payment succeeds and doesn’t require authentication.       | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000002500003155    | The card payment requires *authentication*.                         | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000000000009995    | The card is declined with a decline code like `insufficient_funds`. | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 6205500000000000004 | The UnionPay card has a variable length of 13-19 digits.            | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |

| Payment method | Scenario                                                                                                                                                                   | How to test                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | Your customer fails to authenticate on the redirect page for a redirect-based and immediate notification payment method.                                                   | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page. |
| Pay by Bank    | Your customer successfully pays with a redirect-based and [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method. | Choose the payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page.            |
| Pay by Bank    | Your customer fails to authenticate on the redirect page for a redirect-based and delayed notification payment method.                                                     | Choose the payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page.                |

| Payment method    | Scenario                                                                                          | How to test                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEPA Direct Debit | Your customer successfully pays with SEPA Direct Debit.                                           | Fill out the form using the account number `AT321904300235473204`. The confirmed PaymentIntent initially transitions to processing, then transitions to the succeeded status three minutes later. |
| SEPA Direct Debit | Your customer’s payment intent status transitions from `processing` to `requires_payment_method`. | Fill out the form using the account number `AT861904300235473202`.                                                                                                                                |

See [Testing](https://docs.stripe.com/testing.md) for additional information to test your integration.

## Enable Apple Pay

If your checkout screen has a dedicated **Apple Pay button**, follow the [Apple Pay guide](https://docs.stripe.com/apple-pay.md#present-payment-sheet) and use `ApplePayContext` to collect payment from your Apple Pay button. You can use `PaymentSheet` to handle other payment method types.

### Register for an Apple Merchant ID

Obtain an Apple Merchant ID by [registering for a new identifier](https://developer.apple.com/account/resources/identifiers/add/merchant) on the Apple Developer website.

Fill out the form with a description and identifier. Your description is for your own records and you can modify it in the future. Stripe recommends using the name of your app as the identifier (for example, `merchant.com.{{YOUR_APP_NAME}}`).

### Create a new Apple Pay certificate

Create a certificate for your app to encrypt payment data.

Go to the [iOS Certificate Settings](https://dashboard.stripe.com/settings/ios_certificates) in the Dashboard, click **Add new application**, and follow the guide.

Download a Certificate Signing Request (CSR) file to get a secure certificate from Apple that allows you to use Apple Pay.

One CSR file must be used to issue exactly one certificate. If you switch your Apple Merchant ID, you must go to the [iOS Certificate Settings](https://dashboard.stripe.com/settings/ios_certificates) in the Dashboard to obtain a new CSR and certificate.

### Integrate with Xcode

Add the Apple Pay capability to your app. In Xcode, open your project settings, click the **Signing & Capabilities** tab, and add the **Apple Pay** capability. You might be prompted to log in to your developer account at this point. Select the merchant ID you created earlier, and your app is ready to accept Apple Pay.

![](images/mobile/ios/xcode.png)
Enable the Apple Pay capability in Xcode


### Add Apple Pay

To add Apple Pay to PaymentSheet, set [applePay](https://stripe.dev/stripe-ios/stripe-paymentsheet/Classes/PaymentSheet/Configuration.html#/s:6Stripe12PaymentSheetC13ConfigurationV8applePayAC05ApplefD0VSgvp) after initializing `PaymentSheet.Configuration` with your Apple merchant ID and the [country code of your business](https://dashboard.stripe.com/settings/account).

Per [Apple’s guidelines](https://developer.apple.com/design/human-interface-guidelines/apple-pay#Supporting-subscriptions) for recurring payments, you must also set additional attributes on the `PKPaymentRequest`. Add a handler in [ApplePayConfiguration.paymentRequestHandlers](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/applepayconfiguration/handlers/paymentrequesthandler) to configure the [PKPaymentRequest.paymentSummaryItems](https://developer.apple.com/documentation/passkit/pkpaymentrequest/1619231-paymentsummaryitems) with the amount you intend to charge (for example, 9.95 USD a month).

You can also adopt [merchant tokens](https://developer.apple.com/apple-pay/merchant-tokens/) by setting the `recurringPaymentRequest` or `automaticReloadPaymentRequest` properties on the `PKPaymentRequest`.

To learn more about how to use recurring payments with Apple Pay, see [Apple’s PassKit documentation](https://developer.apple.com/documentation/passkit/pkpaymentrequest).

```swift
let customHandlers = PaymentSheet.ApplePayConfiguration.Handlers(
    paymentRequestHandler: { request in
        // PKRecurringPaymentSummaryItem is available on iOS 15 or later
        if #available(iOS 15.0, *) {
            let billing = PKRecurringPaymentSummaryItem(label: "My Subscription", amount: NSDecimalNumber(string: "59.99"))

            // Payment starts today
            billing.startDate = Date()

            // Payment ends in one year
            billing.endDate = Date().addingTimeInterval(60 * 60 * 24 * 365)

            // Pay once a month.
            billing.intervalUnit = .month
            billing.intervalCount = 1

            // recurringPaymentRequest is only available on iOS 16 or later
            if #available(iOS 16.0, *) {
                request.recurringPaymentRequest = PKRecurringPaymentRequest(paymentDescription: "Recurring",
                                                                            regularBilling: billing,
                                                                            managementURL: URL(string: "https://my-backend.example.com/customer-portal")!)
                request.recurringPaymentRequest?.billingAgreement = "You'll be billed $59.99 every month for the next 12 months. To cancel at any time, go to Account and click 'Cancel Membership.'"
            }
            request.paymentSummaryItems = [billing]
            request.currencyCode = "USD"
        } else {
            // On older iOS versions, set alternative summary items.
            request.paymentSummaryItems = [PKPaymentSummaryItem(label: "Monthly plan starting July 1, 2022", amount: NSDecimalNumber(string: "59.99"), type: .final)]
        }
        return request
    }
)
var configuration = PaymentSheet.Configuration()
configuration.applePay = .init(merchantId: "merchant.com.your_app_name",
                                merchantCountryCode: "US",
                                customHandlers: customHandlers)
```

### Order tracking

To add [order tracking](https://developer.apple.com/design/human-interface-guidelines/technologies/wallet/designing-order-tracking) information in iOS 16 or later, configure an [authorizationResultHandler](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/applepayconfiguration/handlers/authorizationresulthandler) in your `PaymentSheet.ApplePayConfiguration.Handlers`. Stripe calls your implementation after the payment is complete, but before iOS dismisses the Apple Pay sheet.

In your `authorizationResultHandler` implementation, fetch the order details from your server for the completed order. Add the details to the provided [PKPaymentAuthorizationResult](https://developer.apple.com/documentation/passkit/pkpaymentauthorizationresult) and call the provided completion handler.

To learn more about order tracking, see [Apple’s Wallet Orders documentation](https://developer.apple.com/documentation/walletorders).

```swift
let customHandlers = PaymentSheet.ApplePayConfiguration.Handlers(
    authorizationResultHandler: { result, completion in
        // Fetch the order details from your service
        MyAPIClient.shared.fetchOrderDetails(orderID: orderID) { myOrderDetails
            result.orderDetails = PKPaymentOrderDetails(
                orderTypeIdentifier: myOrderDetails.orderTypeIdentifier, // "com.myapp.order"
                orderIdentifier: myOrderDetails.orderIdentifier, // "ABC123-AAAA-1111"
                webServiceURL: myOrderDetails.webServiceURL, // "https://my-backend.example.com/apple-order-tracking-backend"
                authenticationToken: myOrderDetails.authenticationToken) // "abc123"
            // Call the completion block on the main queue with your modified PKPaymentAuthorizationResult
            completion(result)
        }
    }
)
var configuration = PaymentSheet.Configuration()
configuration.applePay = .init(merchantId: "merchant.com.your_app_name",
                               merchantCountryCode: "US",
                               customHandlers: customHandlers)
```

## Enable card scanning

To enable card scanning support, set the `NSCameraUsageDescription` (**Privacy - Camera Usage Description**) in the Info.plist of your application, and provide a reason for accessing the camera (for example, “To scan cards”). Devices with iOS 13 or higher support card scanning.

## Customize the sheet

All customization is configured through the [PaymentSheet.Configuration](https://stripe.dev/stripe-ios/stripe-paymentsheet/Classes/PaymentSheet/Configuration.html) object.

### Appearance

Customize colors, fonts, and so on to match the look and feel of your app by using the [appearance API](https://docs.stripe.com/elements/appearance-api.md?platform=ios).

### Payment method layout

Configure the layout of payment methods in the sheet using [paymentMethodLayout](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/configuration-swift.struct/paymentmethodlayout). You can display them horizontally, vertically, or let Stripe optimize the layout automatically.

![](images/mobile/payment-sheet/ios-mpe-payment-method-layouts.png)

```swift
var configuration = PaymentSheet.Configuration()
configuration.paymentMethodLayout = .automatic
```

### Collect users addresses

Collect local and international shipping or billing addresses from your customers using the [Address Element](https://docs.stripe.com/elements/address-element.md?platform=ios).

### Merchant display name

Specify a customer-facing business name by setting [merchantDisplayName](https://stripe.dev/stripe-ios/stripe-paymentsheet/Classes/PaymentSheet/Configuration.html#/s:18StripePaymentSheet0bC0C13ConfigurationV19merchantDisplayNameSSvp). By default, this is your app’s name.

```swift
var configuration = PaymentSheet.Configuration()
configuration.merchantDisplayName = "My app, Inc."
```

### Dark mode

`PaymentSheet` automatically adapts to the user’s system-wide appearance settings (light and dark mode). If your app doesn’t support dark mode, you can set [style](https://stripe.dev/stripe-ios/stripe-paymentsheet/Classes/PaymentSheet/Configuration.html#/s:18StripePaymentSheet0bC0C13ConfigurationV5styleAC18UserInterfaceStyleOvp) to `alwaysLight` or `alwaysDark` mode.

```swift
var configuration = PaymentSheet.Configuration()
configuration.style = .alwaysLight
```

## Complete payment in your UI

You can present the Payment Sheet to only collect payment method details and then later call a `confirm` method to complete payment in your app’s UI. This is useful if you have a custom buy button or require additional steps after you collect payment details.

![](images/mobile/payment-sheet/ios-multi-step.png)
Complete the payment in your app’s UI


The following steps walk you through how to complete payment in your app’s UI. See our sample integration out on [GitHub](https://github.com/stripe/stripe-ios/blob/master/Example/PaymentSheet%20Example/PaymentSheet%20Example/ExampleCustomCheckoutViewController.swift).

1. First, initialize [PaymentSheet.FlowController](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/flowcontroller) instead of `PaymentSheet` and update your UI with its `paymentOption` property. This property contains an image and label representing the customer’s initially selected, default payment method.

```swift
PaymentSheet.FlowController.create(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration) { [weak self] result in
  switch result {
  case .failure(let error):
    print(error)
  case .success(let paymentSheetFlowController):
    self?.paymentSheetFlowController = paymentSheetFlowController
    // Update your UI using paymentSheetFlowController.paymentOption
  }
}
```

1. Next, call `presentPaymentOptions` to collect payment details. When completed, update your UI again with the `paymentOption` property.

```swift
paymentSheetFlowController.presentPaymentOptions(from: self) {
  // Update your UI using paymentSheetFlowController.paymentOption
}
```

1. Finally, call `confirm`.

```swift
paymentSheetFlowController.confirm(from: self) { paymentResult in
  // MARK: Handle the payment result
  switch paymentResult {
  case .completed:
    print("Payment complete!")
  case .canceled:
    print("Canceled!")
  case .failed(let error):
    print(error)
  }
}
```

The following steps walk you through how to complete payment in your app’s UI. See our sample integration out on [GitHub](https://github.com/stripe/stripe-ios/blob/master/Example/PaymentSheet%20Example/PaymentSheet%20Example/ExampleSwiftUICustomPaymentFlow.swift).

1. First, initialize [PaymentSheet.FlowController](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/flowcontroller) instead of `PaymentSheet`. Its `paymentOption` property contains an image and label representing the customer’s currently selected payment method, which you can use in your UI.

```swift
PaymentSheet.FlowController.create(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration) { [weak self] result in
  switch result {
  case .failure(let error):
    print(error)
  case .success(let paymentSheetFlowController):
    self?.paymentSheetFlowController = paymentSheetFlowController
    // Use the paymentSheetFlowController.paymentOption properties in your UI
    myPaymentMethodLabel = paymentSheetFlowController.paymentOption?.label ?? "Select a payment method"
    myPaymentMethodImage = paymentSheetFlowController.paymentOption?.image ?? UIImage(systemName: "square.and.pencil")!
  }
}
```

1. Use [PaymentSheet.FlowController.PaymentOptionsButton](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/flowcontroller/paymentoptionsbutton) to wrap the button that presents the sheet to collect payment details. When `PaymentSheet.FlowController` calls the `onSheetDismissed` argument, the `paymentOption` for the `PaymentSheet.FlowController` instance reflects the currently selected payment method.

```swift
PaymentSheet.FlowController.PaymentOptionsButton(
  paymentSheetFlowController: paymentSheetFlowController,
  onSheetDismissed: {
    myPaymentMethodLabel = paymentSheetFlowController.paymentOption?.label ?? "Select a payment method"
    myPaymentMethodImage = paymentSheetFlowController.paymentOption?.image ?? UIImage(systemName: "square.and.pencil")!
  },
  content: {
    /* An example button */
    HStack {
      Text(myPaymentMethodLabel)
      Image(uiImage: myPaymentMethodImage)
    }
  }
)
```

1. Use [PaymentSheet.FlowController.PaymentOptionsButton](https://stripe.dev/stripe-ios/stripepaymentsheet/documentation/stripepaymentsheet/paymentsheet/flowcontroller/paymentoptionsbutton) to wrap the button that confirms the payment.

```swift
PaymentSheet.FlowController.ConfirmButton(
  paymentSheetFlowController: paymentSheetFlowController,
  onCompletion: { result in
    // MARK: Handle the payment result
    switch result {
    case .completed:
      print("Payment complete!")
    case .canceled:
      print("Canceled!")
    case .failed(let error):
      print(error)
    }
  },
  content: {
    /* An example button */
    Text("Pay")
  }
)
```

Setting `allowsDelayedPaymentMethods` to true allows [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment methods like US bank accounts. For these payment methods, the final payment status isn’t known when the `PaymentSheet` completes, and instead succeeds or fails later. If you support these types of payment methods, inform the customer their order is confirmed and only fulfill their order (for example, ship their product) when the payment is successful.

# Card element only

> This is a Card element only for when platform is ios and mobile-ui is card-element. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=ios&mobile-ui=card-element.

Securely collect card information on the client with [STPPaymentCardTextField](https://stripe.dev/stripe-ios/stripe-payments-ui/Classes/STPPaymentCardTextField.html), a drop-in UI component provided by the SDK that collects the card number, expiration date, CVC, and postal code.

[STPPaymentCardTextField](https://stripe.dev/stripe-ios/stripe-payments-ui/Classes/STPPaymentCardTextField.html) performs on-the-fly validation and formatting.

This guide demonstrates how to accept payments and move funds to the bank accounts of your sellers or service providers. For demonstration purposes, we’ll build a home-rental marketplace that connects homeowners to people looking for a place to rent. You can use the concepts covered in this guide in other applications as well.

## Prerequisites

## Set up Stripe

### Server-side 

This integration requires endpoints on your server that talk to the Stripe API. Use the official libraries for access to the Stripe API from your server:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

### Client-side 

Configure the SDK with your Stripe [publishable key](https://dashboard.stripe.com/test/apikeys) on app start. This enables your app to make requests to the Stripe API.

Use your [test keys](https://docs.stripe.com/keys.md#obtain-api-keys) while you test and develop, and your [live mode](https://docs.stripe.com/keys.md#test-live-modes) keys when you publish your app.

## Create a connected account

When a user (seller or service provider) signs up on your platform, create a user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_) so you can accept payments and move funds to their bank account. Connected accounts represent your users in the Stripe API and help collect the information required to verify the user’s identity. In our home-rental example, the connected account represents the homeowner.

![](images/connect/express-ios.png)

This guide uses Express accounts, which have certain [restrictions](https://docs.stripe.com/connect/express-accounts.md#prerequisites-for-using-express). You can evaluate [Custom accounts](https://docs.stripe.com/connect/custom-accounts.md) as an alternative.

### Step 2.1: Create a connected account and prefill information  

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Step 2.2: Create an account link  

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Step 2.3: Redirect your user to the account link URL  

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and can be used only once because they grant access to the account holder’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link for an Express account, you will not be able to read or write information for the account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

```swift
import UIKit
import SafariServices

let BackendAPIBaseURL: String = "" // Set to the URL of your backend server

class ConnectOnboardViewController: UIViewController {

    // ...

    override func viewDidLoad() {
        super.viewDidLoad()

        let connectWithStripeButton = UIButton(type: .system)
        connectWithStripeButton.setTitle("Connect with Stripe", for: .normal)
        connectWithStripeButton.addTarget(self, action: #selector(didSelectConnectWithStripe), for: .touchUpInside)
        view.addSubview(connectWithStripeButton)

        // ...
    }

    @objc
    func didSelectConnectWithStripe() {
        if let url = URL(string: BackendAPIBaseURL)?.appendingPathComponent("onboard-user") {
          var request = URLRequest(url: url)
          request.httpMethod = "POST"
          let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
              guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String : Any],
                  let accountURLString = json["url"] as? String,
                  let accountURL = URL(string: accountURLString) else {
                      // handle error
              }

              let safariViewController = SFSafariViewController(url: accountURL)
              safariViewController.delegate = self

              DispatchQueue.main.async {
                  self.present(safariViewController, animated: true, completion: nil)
              }
          }
        }
    }

    // ...
}

extension ConnectOnboardViewController: SFSafariViewControllerDelegate {
    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        // the user may have closed the SFSafariViewController instance before a redirect
        // occurred. Sync with your backend to confirm the correct state
    }
}

```

```objc
\#import "ConnectOnboardViewController.h"

#import <SafariServices/SafariServices.h>

static NSString * const kBackendAPIBaseURL = @"";  // Set to the URL of your backend server

@interface ConnectOnboardViewController () <SFSafariViewControllerDelegate>
// ...
@end

@implementation ConnectOnboardViewController

// ...

- (void)viewDidLoad {
    [super viewDidLoad];

    UIButton *connectWithStripeButton = [UIButton buttonWithType:UIButtonTypeSystem];
    [connectWithStripeButton setTitle:@"Connect with Stripe" forState:UIControlStateNormal];
    [connectWithStripeButton addTarget:self action:@selector(_didSelectConnectWithStripe) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:connectWithStripeButton];

    // ...
}

- (void)_didSelectConnectWithStripe {
  NSURL *url = [NSURL URLWithString:[kBackendAPIBaseURL stringByAppendingPathComponent:@"onboard-user"]];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = @"POST";

  NSURLSessionTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
      if (data != nil) {
          NSError *jsonError = nil;
          id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];

          if (json != nil && [json isKindOfClass:[NSDictionary class]]) {
              NSDictionary *jsonDictionary = (NSDictionary *)json;
              NSURL *accountURL = [NSURL URLWithString:jsonDictionary[@"url"]];
              if (accountURL != nil) {
                  SFSafariViewController *safariViewController = [[SFSafariViewController alloc] initWithURL:accountURL];
                  safariViewController.delegate = self;

                  dispatch_async(dispatch_get_main_queue(), ^{
                      [self presentViewController:safariViewController animated:YES completion:nil];
                  });
              } else {
                  // handle  error
              }
          } else {
              // handle error
          }
      } else {
          // handle error
      }
  }];
  [task resume];
}

// ...

#pragma mark - SFSafariViewControllerDelegate
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller {
    // The user may have closed the SFSafariViewController instance before a redirect
    // occurred. Sync with your backend to confirm the correct state
}

@end

```

### Step 2.4: Handle the user returning to your platform  

*Connect* Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user will be redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user. You can set up a [universal link](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content) to enable iOS to redirect to your app automatically.

#### return_url

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This does not mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` *webhooks*
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url

Your user will be redirected to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created)
- The link was already visited (the user refreshed the page or clicked back or forward in the browser)
- The link was shared in a third-party application such as a messaging client that attempts to access the URL to preview it. Many clients automatically visit links which cause them to become expired
- Your platform is no longer able to access the account
- The account has been rejected

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Step 2.5: Handle users that have not completed onboarding 

A user that is redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account is not fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Accept a payment

### Step 3.1: Create your checkout page  

Securely collect card information on the client with [STPPaymentCardTextField](https://stripe.dev/stripe-ios/stripe-payments-ui/Classes/STPPaymentCardTextField.html), a drop-in UI component provided by the SDK that collects the card number, expiration date, CVC, and postal code.

[STPPaymentCardTextField](https://stripe.dev/stripe-ios/stripe-payments-ui/Classes/STPPaymentCardTextField.html) performs on-the-fly validation and formatting.

Create an instance of the card component and a **Pay** button with the following code:

```swift
import UIKit
import StripePaymentsUI

class CheckoutViewController: UIViewController {

    lazy var cardTextField: STPPaymentCardTextField = {
        let cardTextField = STPPaymentCardTextField()
        return cardTextField
    }()
    lazy var payButton: UIButton = {
        let button = UIButton(type: .custom)
        button.layer.cornerRadius = 5
        button.backgroundColor = .systemBlue
        button.titleLabel?.font = UIFont.systemFont(ofSize: 22)
        button.setTitle("Pay", for: .normal)
        button.addTarget(self, action: #selector(pay), for: .touchUpInside)
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let stackView = UIStackView(arrangedSubviews: [cardTextField, payButton])
        stackView.axis = .vertical
        stackView.spacing = 20
        stackView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stackView)
        NSLayoutConstraint.activate([
            stackView.leftAnchor.constraint(equalToSystemSpacingAfter: view.leftAnchor, multiplier: 2),
            view.rightAnchor.constraint(equalToSystemSpacingAfter: stackView.rightAnchor, multiplier: 2),
            stackView.topAnchor.constraint(equalToSystemSpacingBelow: view.topAnchor, multiplier: 2),
        ])
    }

    @objc
    func pay() {
        // ...
    }
}
```

```objc
\#import "CheckoutViewController.h"
@import StripeCore;
@import StripePayments;
@import StripePaymentsUI;

@interface CheckoutViewController ()

@property (weak) STPPaymentCardTextField *cardTextField;
@property (weak) UIButton *payButton;

@end

@implementation CheckoutViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = [UIColor whiteColor];

    STPPaymentCardTextField *cardTextField = [[STPPaymentCardTextField alloc] init];
    self.cardTextField = cardTextField;

    UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
    button.layer.cornerRadius = 5;
    button.backgroundColor = [UIColor systemBlueColor];
    button.titleLabel.font = [UIFont systemFontOfSize:22];
    [button setTitle:@"Pay" forState:UIControlStateNormal];
    [button addTarget:self action:@selector(pay) forControlEvents:UIControlEventTouchUpInside];
    self.payButton = button;

    UIStackView *stackView = [[UIStackView alloc] initWithArrangedSubviews:@[cardTextField, button]];
    stackView.axis = UILayoutConstraintAxisVertical;
    stackView.translatesAutoresizingMaskIntoConstraints = NO;
    stackView.spacing = 20;
    [self.view addSubview:stackView];

    [NSLayoutConstraint activateConstraints:@[
        [stackView.leftAnchor constraintEqualToSystemSpacingAfterAnchor:self.view.leftAnchor multiplier:2],
        [self.view.rightAnchor constraintEqualToSystemSpacingAfterAnchor:stackView.rightAnchor multiplier:2],
        [stackView.topAnchor constraintEqualToSystemSpacingBelowAnchor:self.view.topAnchor multiplier:2],
    ]];
}

- (void)pay {
    // ...
}

@end
```

Run your app, and make sure your checkout page shows the card component and pay button.

### Step 3.2: Create a PaymentIntent   

Stripe uses a [PaymentIntent](https://docs.stripe.com/api/payment_intents.md) object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

Instead of passing the entire PaymentIntent object to your app, just return its *client secret*.  The PaymentIntent’s client secret is a unique key that lets you confirm the payment and update card details on the client, without allowing manipulation of sensitive information, like payment amount.

On the client, request a PaymentIntent from your server and store its *client secret*.

### Step 3.3: Submit the payment to Stripe  

When the customer taps the **Pay** button, *confirm* the `PaymentIntent` to complete the payment.

First, assemble a  object with:

1. The card ’s payment method details
1. The `PaymentIntent` client secret from your server

Rather than sending the entire PaymentIntent object to the client, use its
*client secret*. This is different from your API keys that authenticate Stripe API requests. The client secret is a string that lets your app access important fields from the PaymentIntent (for example, `status`) while hiding sensitive ones (for example, `customer`).

Handle the client secret carefully, because it can complete the charge. Don’t log it, embed it in URLs, or expose it to anyone but the customer.

Next, complete the payment by calling the  method.

You can [save a customer’s payment card details](https://docs.stripe.com/payments/payment-intents.md#future-usage) on payment confirmation by providing both `setupFutureUsage` and a `customer` on the `PaymentIntent`. You can also supply these parameters when creating the `PaymentIntent` on your server.

Supplying an appropriate `setupFutureUsage` value for your application might require your customer to complete additional authentication steps, but reduces the chance of banks rejecting future payments. [Learn how to optimize cards for future payments](https://docs.stripe.com/payments/payment-intents.md#future-usage) and determine which value to use for your application.

You can use a card that’s set up for on-session payments to make off-session payments, but the bank is more likely to reject the off-session payment and require authentication from the cardholder.

You can also check the status of a `PaymentIntent` in the [Dashboard](https://dashboard.stripe.com/test/payments) or by inspecting the `status` property on the object.

### Step 3.4: Test the integration  

​​Several test cards are available for you to use in a sandbox to make sure this integration is ready. Use them with any CVC and an expiration date in the future.

| Number           | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| 4242424242424242 | Succeeds and immediately processes the payment.                                           |
| 4000002500003155 | Requires authentication. Stripe triggers a modal asking for the customer to authenticate. |
| 4000000000009995 | Always fails with a decline code of `insufficient_funds`.                                 |

For the full list of test cards see our guide on [testing](https://docs.stripe.com/testing.md).

### Step 3.5: Fulfillment  

After the payment is completed, you’ll need to handle any *fulfillment* necessary on your end. A home-rental company that requires payment upfront, for instance, would connect the homeowner with the renter after a successful payment.

Configure a *webhook* endpoint (for events _from your account_) [in your dashboard](https://dashboard.stripe.com/account/webhooks).

![](images/connect/account_webhooks.png)

Then create an HTTP endpoint on your server to monitor for completed payments to enable your sellers or service providers to fulfill purchases. Make sure to replace the endpoint secret key (`whsec_...`) in the example with your key.

### Testing webhooks locally

Use the Stripe CLI to test webhooks locally.

1. First, [install the Stripe CLI](https://docs.stripe.com/stripe-cli.md#install) on your machine if you haven’t already.

1. Then, to log in run `stripe login` in the command line, and follow the instructions.

1. Finally, to allow your local host to receive a simulated event on your connected account run `stripe listen --forward-to localhost:{PORT}/webhook` in one terminal window, and run stripe trigger --stripe-account={{CONNECTED_STRIPE_ACCOUNT_ID}}  (or trigger any other [supported event](https://github.com/stripe/stripe-cli/wiki/trigger-command#supported-events)) in another.

### Step 3.6: Disputes 

As the [settlement merchant](https://docs.stripe.com/connect/destination-charges.md#settlement-merchant) on charges, your platform is responsible for disputes. Make sure you understand the [best practices](https://docs.stripe.com/disputes/responding.md) for responding to disputes.

## Testing

Test your account creation flow by [creating accounts](https://docs.stripe.com/connect/testing.md#creating-accounts) and [using OAuth](https://docs.stripe.com/connect/testing.md#using-oauth). You can use [the available test cards](https://docs.stripe.com/testing.md) to test your payments flow and simulate various payment outcomes.

# Payment sheet

> This is a Payment sheet for when platform is android and mobile-ui is payment-element. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=android&mobile-ui=payment-element.

This guide demonstrates how to accept payments and move funds to the bank accounts of your sellers or service providers. For demonstration purposes, we’ll build a home-rental marketplace that connects homeowners to people looking for a place to rent. You can use the concepts covered in this guide in other applications as well.

## Prerequisites

## Set up Stripe

### Server-side 

This integration requires endpoints on your server that talk to the Stripe API. Use the official libraries for access to the Stripe API from your server:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

### Client-side 

```kotlin
plugins {
    id("com.android.application")
}

android { ... }

dependencies {
  // ...

}
```

```groovy
apply plugin: 'com.android.application'

android { ... }

dependencies {
  // ...

}
```

For details on the latest SDK release and past versions, see the [Releases](https://github.com/stripe/stripe-android/releases) page on GitHub. To receive notifications when a new release is published, [watch releases for the repository](https://docs.github.com/en/github/managing-subscriptions-and-notifications-on-github/configuring-notifications#configuring-your-watch-settings-for-an-individual-repository).

Stripe samples also use [OkHttp](https://github.com/square/okhttp) and [GSON](https://github.com/google/gson) to make HTTP requests to a server.

## Create a connected account

When a user (seller or service provider) signs up on your platform, create a user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_) so you can accept payments and move funds to their bank account. Connected accounts represent your users in the Stripe API and help collect the information required to verify the user’s identity. In our home-rental example, the connected account represents the homeowner.

![](images/connect/express-android.png)

This guide uses Express accounts, which have certain [restrictions](https://docs.stripe.com/connect/express-accounts.md#prerequisites-for-using-express). You can evaluate [Custom accounts](https://docs.stripe.com/connect/custom-accounts.md) as an alternative.

### Step 2.1: Create a connected account and prefill information  

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Step 2.2: Create an account link  

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Step 2.3: Redirect your user to the account link URL  

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and are single-use only, because they grant access to the connected account user’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link for an Express account, you can’t read or write information for the account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".activity.ConnectWithStripeActivity">

    <Button
        android:id="@+id/connect_with_stripe"
        android:text="Connect with Stripe"
        android:layout_height="wrap_content"
        android:layout_width="wrap_content"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        style="?attr/materialButtonOutlinedStyle"
        />

</androidx.constraintlayout.widget.ConstraintLayout>
```

```kotlin
class ConnectWithStripeActivity : AppCompatActivity() {

    private val viewBinding: ActivityConnectWithStripeViewBinding by lazy {
        ActivityConnectWithStripeViewBinding.inflate(layoutInflater)
    }
    private val httpClient = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(viewBinding.root)

        viewBinding.connectWithStripe.setOnClickListener {
            val weakActivity = WeakReference<Activity>(this)
            val request = Request.Builder()
                .url(BACKEND_URL + "onboard-user")
                .post("".toRequestBody())
                .build()
            httpClient.newCall(request)
                .enqueue(object: Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        // Request failed
                    }
                    override fun onResponse(call: Call, response: Response) {
                        if (!response.isSuccessful) {
                            // Request failed
                        } else {
                            val responseData = response.body?.string()
                            val responseJson =
                                responseData?.let { JSONObject(it) } ?: JSONObject()
                            val url = responseJson.getString("url")

                            weakActivity.get()?.let {
                                val builder: CustomTabsIntent.Builder = CustomTabsIntent.Builder()
                                val customTabsIntent = builder.build()
                                customTabsIntent.launchUrl(it, Uri.parse(url))
                            }
                        }
                    }
                })
        }
    }

    internal companion object {
        internal const val BACKEND_URL = "https://example-backend-url.com/"
    }
}
```

```java
public class ConnectWithStripeActivity extends AppCompatActivity {
    private static final String BACKEND_URL = "https://example-backend-url.com/";
    private OkHttpClient httpClient = new OkHttpClient();
    private ActivityConnectWithStripeViewBinding viewBinding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewBinding = ActivityConnectWithStripeViewBinding.inflate(getLayoutInflater());

        viewBinding.connectWithStripe.setOnClickListener(view -> {
            WeakReference<Activity> weakActivity = new WeakReference<>(this);
            Request request = new Request.Builder()
                    .url(BACKEND_URL + "onboard-user")
                    .post(RequestBody.create("", MediaType.get("application/json; charset=utf-8")))
                    .build();
            httpClient.newCall(request)
                    .enqueue(new Callback() {
                        @Override
                        public void onFailure(@NotNull Call call, @NotNull IOException e) {
                            // Request failed
                        }

                        @Override
                        public void onResponse(@NotNull Call call, @NotNull Response response) throws IOException {
                            final Activity activity = weakActivity.get();
                            if (activity == null) {
                                return;
                            }
                            if (!response.isSuccessful() || response.body() == null) {
                                // Request failed
                            } else {
                                String body = response.body().string();
                                try {
                                    JSONObject responseJson = new JSONObject(body);
                                    String url = responseJson.getString("url");
                                    CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
                                    CustomTabsIntent customTabsIntent = builder.build();
                                    customTabsIntent.launchUrl(view.getContext(), Uri.parse(url));
                                } catch (JSONException e) {
                                    e.printStackTrace();
                                }
                            }
                        }
                    });
        });
    }
}
```

### Step 2.4: Handle the user returning to your platform  

*Connect* Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user is redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user. You can set up a [deep link](https://developer.android.com/training/app-links/deep-linking) to enable Android to redirect to your app automatically.

#### return_url

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This doesn’t mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` *webhooks*
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url

Stripe redirects your user to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created).
- The user already visited the URL (the user refreshed the page or clicked back or forward in the browser).
- Your platform is no longer able to access the account.
- The account has been rejected.

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Step 2.5: Handle users that haven’t completed onboarding 

A user that’s redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account isn’t fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Enable payment methods

View your [payment methods settings](https://dashboard.stripe.com/settings/connect/payment_methods) and enable the payment methods you want to support. Card payments, Google Pay, and Apple Pay are enabled by default but you can enable and disable payment methods as needed.

Before the payment form is displayed, Stripe evaluates the currency, payment method restrictions, and other parameters to determine the list of supported payment methods. Payment methods that increase conversion and that are most relevant to the currency and customer’s location are prioritized. Lower priority payment methods are hidden in an overflow menu.

## Add an endpoint

## Integrate the payment sheet

## Handle post-payment events

Stripe sends a [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md#event_types-payment_intent.succeeded) event when the payment completes. Use the [Dashboard webhook tool](https://dashboard.stripe.com/webhooks) or follow the [webhook guide](https://docs.stripe.com/webhooks/quickstart.md) to receive these events and run actions, such as sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes, and malicious clients could manipulate the response. Setting up your integration to listen for asynchronous events is what enables you to accept [different types of payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `payment_intent.succeeded` event, we recommend handling these other events when collecting payments with the Payment Element:

| Event                                                                                                                           | Description                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.succeeded)           | Sent when a customer successfully completes a payment.                                                                                                                                                                                                                              | Send the customer an order confirmation and *fulfill* their order.                                                                                                              |
| [payment_intent.processing](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.processing)         | Sent when a customer successfully initiates a payment, but the payment has yet to complete. This event is most commonly sent when the customer initiates a bank debit. It’s followed by either a `payment_intent.succeeded` or `payment_intent.payment_failed` event in the future. | Send the customer an order confirmation that indicates their payment is pending. For digital goods, you might want to fulfill the order before waiting for payment to complete. |
| [payment_intent.payment_failed](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.payment_failed) | Sent when a customer attempts a payment, but the payment fails.                                                                                                                                                                                                                     | If a payment transitions from `processing` to `payment_failed`, offer the customer another attempt to pay.                                                                      |

## Test the integration

| Card number         | Scenario                                                            | How to test                                                                                           |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4242424242424242    | The card payment succeeds and doesn’t require authentication.       | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000002500003155    | The card payment requires *authentication*.                         | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000000000009995    | The card is declined with a decline code like `insufficient_funds`. | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 6205500000000000004 | The UnionPay card has a variable length of 13-19 digits.            | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |

| Payment method | Scenario                                                                                                                                                                   | How to test                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | Your customer fails to authenticate on the redirect page for a redirect-based and immediate notification payment method.                                                   | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page. |
| Pay by Bank    | Your customer successfully pays with a redirect-based and [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method. | Choose the payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page.            |
| Pay by Bank    | Your customer fails to authenticate on the redirect page for a redirect-based and delayed notification payment method.                                                     | Choose the payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page.                |

| Payment method    | Scenario                                                                                          | How to test                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEPA Direct Debit | Your customer successfully pays with SEPA Direct Debit.                                           | Fill out the form using the account number `AT321904300235473204`. The confirmed PaymentIntent initially transitions to processing, then transitions to the succeeded status three minutes later. |
| SEPA Direct Debit | Your customer’s payment intent status transitions from `processing` to `requires_payment_method`. | Fill out the form using the account number `AT861904300235473202`.                                                                                                                                |

See [Testing](https://docs.stripe.com/testing.md) for additional information to test your integration.

## Enable Google Pay

### Set up your integration

To use Google Pay, first enable the Google Pay API by adding the following to the `<application>` tag of your **AndroidManifest.xml**:

```xml
<application>
  ...
  <meta-data
    android:name="com.google.android.gms.wallet.api.enabled"
    android:value="true" />
</application>
```

This guide assumes you’re using the latest version of the Stripe Android SDK.

```groovy
dependencies {
    implementation 'com.stripe:stripe-android:21.11.1'
}
```

```kotlin
dependencies {
    implementation("com.stripe:stripe-android:21.11.1")
}
```

For more details, see Google Pay’s [Set up Google Pay API](https://developers.google.com/pay/api/android/guides/setup) for Android.

### Add Google Pay

To add Google Pay to your integration, pass a [PaymentSheet.GooglePayConfiguration](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-google-pay-configuration/index.html) with your Google Pay environment (production or test) and the [country code of your business](https://dashboard.stripe.com/settings/account) when initializing [PaymentSheet.Configuration](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-configuration/index.html).

```kotlin
val googlePayConfiguration = PaymentSheet.GooglePayConfiguration(
  environment = PaymentSheet.GooglePayConfiguration.Environment.Test,
  countryCode = "US",
  currencyCode = "USD" // Required for Setup Intents, optional for Payment Intents
)
val configuration = PaymentSheet.Configuration(...)
configuration.googlePay = googlePayConfiguration
```

```java
final PaymentSheet.GooglePayConfiguration googlePayConfiguration =
  new PaymentSheet.GooglePayConfiguration(
    PaymentSheet.GooglePayConfiguration.Environment.Test,
    "US"
  );

 final PaymentSheet.Configuration configuration = // ...
 configuration.setGooglePay(googlePayConfiguration);
);
```

## Customize the sheet

All customization is configured using the [PaymentSheet.Configuration](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-configuration/index.html) object.

### Appearance

Customize colors, fonts, and more to match the look and feel of your app by using the [appearance API](https://docs.stripe.com/elements/appearance-api.md?platform=android).

### Payment method layout

Configure the layout of payment methods in the sheet using [paymentMethodLayout](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-configuration/-builder/index.html#2123253356%2FFunctions%2F2002900378). You can display them horizontally, vertically, or let Stripe optimize the layout automatically.

![](images/mobile/payment-sheet/android-mpe-payment-method-layouts.png)

```kotlin
PaymentSheet.Configuration.Builder("Example, Inc.")
  .paymentMethodLayout(PaymentSheet.PaymentMethodLayout.Automatic)
  .build()
)
```

```java
new PaymentSheet.Configuration.Builder("Example, Inc.")
  .paymentMethodLayout(PaymentSheet.PaymentMethodLayout.Automatic)
  .build();
```

### Collect users addresses

Collect local and international shipping or billing addresses from your customers using the [Address Element](https://docs.stripe.com/elements/address-element.md?platform=android).

### Merchant display name

Specify a customer-facing business name by setting [merchantDisplayName](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-configuration/index.html#-191101533%2FProperties%2F2002900378). By default, this is your app’s name.

```kotlin
PaymentSheet.Configuration(
  merchantDisplayName = "My app, Inc."
)
```

```java
new PaymentSheet.Configuration(
  "My app, Inc."
);
```

### Dark mode

By default, `PaymentSheet` automatically adapts to the user’s system-wide appearance settings (light and dark mode). You can change this by setting light or dark mode on your app:

```kotlin
// force dark
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
// force light
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
```

```java
// force dark
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
// force light
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
```

## Complete payment in your UI

You can present Payment Sheet to only collect payment method details and complete the payment back in your app’s UI. This is useful if you have a custom buy button or require additional steps after payment details are collected.

![](images/mobile/payment-sheet/android-multi-step.png)

A sample integration is [available on our GitHub](https://github.com/stripe/stripe-android/blob/master/paymentsheet-example/src/main/java/com/stripe/android/paymentsheet/example/samples/ui/custom_flow/CustomFlowActivity.kt).

1. First, initialize [PaymentSheet.FlowController](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-flow-controller/index.html) instead of `PaymentSheet` using one of the [create](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-flow-controller/-companion/index.html) methods.

```kotlin
class CheckoutActivity : AppCompatActivity() {
  private lateinit var flowController: PaymentSheet.FlowController

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    flowController = PaymentSheet.FlowController.create(
      this,
      ::onPaymentOption,
      ::onPaymentSheetResult
    )
  }
}
```

```java
public class CheckoutActivity extends AppCompatActivity {
  private PaymentSheet.FlowController flowController;

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final PaymentOptionCallback paymentOptionCallback = paymentOption -> {
      onPaymentOption(paymentOption);
    };

    final PaymentSheetResultCallback paymentSheetResultCallback = paymentSheetResult -> {
      onPaymentSheetResult(paymentSheetResult);
    };

    flowController = PaymentSheet.FlowController.create(
      this,
      paymentOptionCallback,
      paymentSheetResultCallback
    );
  }
}
```

2. Next, call `configureWithPaymentIntent` with the Stripe object keys fetched from your backend and update your UI in the callback using [getPaymentOption()](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-flow-controller/index.html#-2091462043%2FFunctions%2F2002900378). This contains an image and label representing the customer’s currently selected payment method.

```kotlin
flowController.configureWithPaymentIntent(
  paymentIntentClientSecret = paymentIntentClientSecret,
  configuration = PaymentSheet.Configuration(
    merchantDisplayName = "Example, Inc.",
    customer = PaymentSheet.CustomerConfiguration(
      id = customerId,
      ephemeralKeySecret = ephemeralKeySecret
    )
  )
) { isReady, error ->
  if (isReady) {
    // Update your UI using `flowController.getPaymentOption()`
  } else {
    // handle FlowController configuration failure
  }
}
```

```java
flowController.configureWithPaymentIntent(
  paymentIntentClientSecret,
  new PaymentSheet.Configuration(
    "Example, Inc.",
    new PaymentSheet.CustomerConfiguration(
      customerId,
      ephemeralKeySecret
    )
  ),
  (success, error) -> {
    if (success) {
      // Update your UI using `flowController.getPaymentOption()`
    } else {
      // handle FlowController configuration failure
    }
  }
);
```

3. Next, call [presentPaymentOptions](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-flow-controller/index.html#449924733%2FFunctions%2F2002900378) to collect payment details. When the customer finishes, the sheet is dismissed and calls the [paymentOptionCallback](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-option-callback/index.html) passed earlier in `create`. Implement this method to update your UI with the returned `paymentOption`.

```kotlin
// ...
  flowController.presentPaymentOptions()
// ...
  private fun onPaymentOption(paymentOption: PaymentOption?) {
    if (paymentOption != null) {
      paymentMethodButton.text = paymentOption.label
      paymentMethodButton.setCompoundDrawablesRelativeWithIntrinsicBounds(
        paymentOption.drawableResourceId,
        0,
        0,
        0
      )
    } else {
      paymentMethodButton.text = "Select"
      paymentMethodButton.setCompoundDrawablesRelativeWithIntrinsicBounds(
        null,
        null,
        null,
        null
      )
    }
  }
```

```java
// ...
    flowController.presentPaymentOptions());
// ...
  private void onPaymentOption(
    @Nullable PaymentOption paymentOption
  ) {
    if (paymentOption != null) {
      paymentMethodButton.setText(paymentOption.getLabel());
      paymentMethodButton.setCompoundDrawablesRelativeWithIntrinsicBounds(
        paymentOption.getDrawableResourceId(),
        0,
        0,
        0
      );
    } else {
      paymentMethodButton.setText("Select");
      paymentMethodButton.setCompoundDrawablesRelativeWithIntrinsicBounds(
        null,
        null,
        null,
        null
      );
    }
  }

  private void onCheckout() {
    // see below
  }
}
```

4. Finally, call [confirm](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet/-flow-controller/index.html#-479056656%2FFunctions%2F2002900378) to complete the payment. When the customer finishes, the sheet is dismissed and calls the [paymentResultCallback](https://stripe.dev/stripe-android/paymentsheet/com.stripe.android.paymentsheet/-payment-sheet-result-callback/index.html#237248767%2FFunctions%2F2002900378) passed earlier in `create`.

```kotlin
// ...
    flowController.confirmPayment()
  // ...

  private fun onPaymentSheetResult(
    paymentSheetResult: PaymentSheetResult
  ) {
    when (paymentSheetResult) {
      is PaymentSheetResult.Canceled -> {
        // Payment canceled
      }
      is PaymentSheetResult.Failed -> {
        // Payment Failed. See logcat for details or inspect paymentSheetResult.error
      }
      is PaymentSheetResult.Completed -> {
        // Payment Complete
      }
    }
  }
```

```java
// ...
    flowController.confirmPayment();
  // ...

  private void onPaymentSheetResult(
    final PaymentSheetResult paymentSheetResult
  ) {
    if (paymentSheetResult instanceof PaymentSheetResult.Canceled) {
      // Payment Canceled
    } else if (paymentSheetResult instanceof PaymentSheetResult.Failed) {
      // Payment Failed. See logcat for details or inspect paymentSheetResult.getError()
    } else if (paymentSheetResult instanceof PaymentSheetResult.Completed) {
      // Payment Complete
    }
  }
```

Setting `allowsDelayedPaymentMethods` to true allows [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment methods like US bank accounts. For these payment methods, the final payment status isn’t known when the `PaymentSheet` completes, and instead succeeds or fails later. If you support these types of payment methods, inform the customer their order is confirmed and only fulfill their order (for example, ship their product) when the payment is successful.

# Card element only

> This is a Card element only for when platform is android and mobile-ui is card-element. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=android&mobile-ui=card-element.

Securely collect card information on the client with [CardInputWidget](https://stripe.dev/stripe-android/stripe/com.stripe.android.view/-card-input-widget/index.html), a drop-in UI component provided by the SDK that collects the card number, expiration date, CVC, and postal code.

[CardInputWidget](https://stripe.dev/stripe-android/stripe/com.stripe.android.view/-card-input-widget/index.html) performs on-the-fly validation and formatting.

This guide demonstrates how to accept payments and move funds to the bank accounts of your sellers or service providers. For demonstration purposes, we’ll build a home-rental marketplace that connects homeowners to people looking for a place to rent. You can use the concepts covered in this guide in other applications as well.

## Prerequisites

## Set up Stripe

### Server-side 

This integration requires endpoints on your server that talk to the Stripe API. Use the official libraries for access to the Stripe API from your server:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

### Client-side 

```kotlin
plugins {
    id("com.android.application")
}

android { ... }

dependencies {
  // ...

}
```

```groovy
apply plugin: 'com.android.application'

android { ... }

dependencies {
  // ...

}
```

For details on the latest SDK release and past versions, see the [Releases](https://github.com/stripe/stripe-android/releases) page on GitHub. To receive notifications when a new release is published, [watch releases for the repository](https://docs.github.com/en/github/managing-subscriptions-and-notifications-on-github/configuring-notifications#configuring-your-watch-settings-for-an-individual-repository).

Stripe samples also use [OkHttp](https://github.com/square/okhttp) and [GSON](https://github.com/google/gson) to make HTTP requests to a server.

## Create a connected account

When a user (seller or service provider) signs up on your platform, create a user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_) so you can accept payments and move funds to their bank account. Connected accounts represent your users in the Stripe API and help collect the information required to verify the user’s identity. In our home-rental example, the connected account represents the homeowner.

![](images/connect/express-android.png)

This guide uses Express accounts, which have certain [restrictions](https://docs.stripe.com/connect/express-accounts.md#prerequisites-for-using-express). You can evaluate [Custom accounts](https://docs.stripe.com/connect/custom-accounts.md) as an alternative.

### Step 2.1: Create a connected account and prefill information  

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Step 2.2: Create an account link  

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Step 2.3: Redirect your user to the account link URL  

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and can only be used once, because they grant access to the account holder’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link for an Express account, you can’t read or write information for the account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".activity.ConnectWithStripeActivity">

    <Button
        android:id="@+id/connect_with_stripe"
        android:text="Connect with Stripe"
        android:layout_height="wrap_content"
        android:layout_width="wrap_content"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        style="?attr/materialButtonOutlinedStyle"
        />

</androidx.constraintlayout.widget.ConstraintLayout>
```

```kotlin
class ConnectWithStripeActivity : AppCompatActivity() {

    private val viewBinding: ActivityConnectWithStripeViewBinding by lazy {
        ActivityConnectWithStripeViewBinding.inflate(layoutInflater)
    }
    private val httpClient = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(viewBinding.root)

        viewBinding.connectWithStripe.setOnClickListener {
            val weakActivity = WeakReference<Activity>(this)
            val request = Request.Builder()
                .url(BACKEND_URL + "onboard-user")
                .post("".toRequestBody())
                .build()
            httpClient.newCall(request)
                .enqueue(object: Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        // Request failed
                    }
                    override fun onResponse(call: Call, response: Response) {
                        if (!response.isSuccessful) {
                            // Request failed
                        } else {
                            val responseData = response.body?.string()
                            val responseJson =
                                responseData?.let { JSONObject(it) } ?: JSONObject()
                            val url = responseJson.getString("url")

                            weakActivity.get()?.let {
                                val builder: CustomTabsIntent.Builder = CustomTabsIntent.Builder()
                                val customTabsIntent = builder.build()
                                customTabsIntent.launchUrl(it, Uri.parse(url))
                            }
                        }
                    }
                })
        }
    }

    internal companion object {
        internal const val BACKEND_URL = "https://example-backend-url.com/"
    }
}
```

```java
public class ConnectWithStripeActivity extends AppCompatActivity {
    private static final String BACKEND_URL = "https://example-backend-url.com/";
    private OkHttpClient httpClient = new OkHttpClient();
    private ActivityConnectWithStripeViewBinding viewBinding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewBinding = ActivityConnectWithStripeViewBinding.inflate(getLayoutInflater());

        viewBinding.connectWithStripe.setOnClickListener(view -> {
            WeakReference<Activity> weakActivity = new WeakReference<>(this);
            Request request = new Request.Builder()
                    .url(BACKEND_URL + "onboard-user")
                    .post(RequestBody.create("", MediaType.get("application/json; charset=utf-8")))
                    .build();
            httpClient.newCall(request)
                    .enqueue(new Callback() {
                        @Override
                        public void onFailure(@NotNull Call call, @NotNull IOException e) {
                            // Request failed
                        }

                        @Override
                        public void onResponse(@NotNull Call call, @NotNull Response response) throws IOException {
                            final Activity activity = weakActivity.get();
                            if (activity == null) {
                                return;
                            }
                            if (!response.isSuccessful() || response.body() == null) {
                                // Request failed
                            } else {
                                String body = response.body().string();
                                try {
                                    JSONObject responseJson = new JSONObject(body);
                                    String url = responseJson.getString("url");
                                    CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
                                    CustomTabsIntent customTabsIntent = builder.build();
                                    customTabsIntent.launchUrl(view.getContext(), Uri.parse(url));
                                } catch (JSONException e) {
                                    e.printStackTrace();
                                }
                            }
                        }
                    });
        });
    }
}
```

### Step 2.4: Handle the user returning to your platform  

*Connect* Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user will be redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user. You can set up a [deep link](https://developer.android.com/training/app-links/deep-linking) to enable Android to redirect to your app automatically.

#### return_url

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This doesn’t mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` *webhooks*
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url

Your user will be redirected to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created).
- The link was already visited (the user refreshed the page or clicked back or forward in the browser).
- The link was shared in a third-party application such as a chat system that attempts to access the URL to preview it. This automatically consumes the link and expires it.
- Your platform is no longer able to access the account.
- The account has been rejected.

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Step 2.5: Handle users that haven’t completed onboarding 

A user that’s redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account isn’t fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Accept a payment

### Step 3.1: Create your checkout page  

Securely collect card information on the client with [CardInputWidget](https://stripe.dev/stripe-android/payments-core/com.stripe.android.view/-card-input-widget/index.html), a drop-in UI component provided by the SDK that collects the card number, expiration date, CVC, and postal code.

[CardInputWidget](https://stripe.dev/stripe-android/payments-core/com.stripe.android.view/-card-input-widget/index.html) performs on-the-fly validation and formatting.

Create an instance of the card component and a **Pay** button by adding the following to your checkout page’s layout:

```xml
<?xml version="1.0" encoding="utf-8"?>

<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="20dp"
    tools:context=".CheckoutActivityKotlin"
    tools:showIn="@layout/activity_checkout">

    <!--  ...  -->

    <com.stripe.android.view.CardInputWidget
        android:id="@+id/cardInputWidget"
        android:layout_width="match_parent"
        android:layout_height="wrap_content" />

    <Button
        android:text="@string/pay"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:id="@+id/payButton"
        android:layout_marginTop="20dp"
        android:backgroundTint="@android:color/holo_green_light"/>

    <!--  ...  -->

</LinearLayout>
```

Run your app, and make sure your checkout page shows the card component and pay button.

### Step 3.2: Create a PaymentIntent   

Stripe uses a [PaymentIntent](https://docs.stripe.com/api/payment_intents.md) object to represent your intent to collect payment from a customer, tracking your charge attempts and payment state changes throughout the process.

Instead of passing the entire PaymentIntent object to your app, just return its *client secret*.  The PaymentIntent’s client secret is a unique key that lets you confirm the payment and update card details on the client, without allowing manipulation of sensitive information, like payment amount.

On the client, request a PaymentIntent from your server and store its *client secret*.

### Step 3.3: Submit the payment to Stripe  

When the customer taps the **Pay** button, *confirm* the `PaymentIntent` to complete the payment.

First, assemble a  object with:

1. The card ’s payment method details
1. The `PaymentIntent` client secret from your server

Rather than sending the entire PaymentIntent object to the client, use its
*client secret*. This is different from your API keys that authenticate Stripe API requests. The client secret is a string that lets your app access important fields from the PaymentIntent (for example, `status`) while hiding sensitive ones (for example, `customer`).

Handle the client secret carefully, because it can complete the charge. Don’t log it, embed it in URLs, or expose it to anyone but the customer.

Next, complete the payment by calling the  method.

You can [save a customer’s payment card details](https://docs.stripe.com/payments/payment-intents.md#future-usage) on payment confirmation by providing both `setupFutureUsage` and a `customer` on the `PaymentIntent`. You can also supply these parameters when creating the `PaymentIntent` on your server.

Supplying an appropriate `setupFutureUsage` value for your application might require your customer to complete additional authentication steps, but reduces the chance of banks rejecting future payments. [Learn how to optimize cards for future payments](https://docs.stripe.com/payments/payment-intents.md#future-usage) and determine which value to use for your application.

You can use a card that’s set up for on-session payments to make off-session payments, but the bank is more likely to reject the off-session payment and require authentication from the cardholder.

You can also check the status of a `PaymentIntent` in the [Dashboard](https://dashboard.stripe.com/test/payments) or by inspecting the `status` property on the object.

### Step 3.4: Test the integration  

​​Several test cards are available for you to use in a sandbox to make sure this integration is ready. Use them with any CVC and an expiration date in the future.

| Number           | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| 4242424242424242 | Succeeds and immediately processes the payment.                                           |
| 4000002500003155 | Requires authentication. Stripe triggers a modal asking for the customer to authenticate. |
| 4000000000009995 | Always fails with a decline code of `insufficient_funds`.                                 |

For the full list of test cards see our guide on [testing](https://docs.stripe.com/testing.md).

### Step 3.5: Fulfillment  

After the payment is completed, you’ll need to handle any *fulfillment* necessary on your end. A home-rental company that requires payment upfront, for instance, would connect the homeowner with the renter after a successful payment.

Configure a *webhook* endpoint (for events _from your account_) [in your dashboard](https://dashboard.stripe.com/account/webhooks).

![](images/connect/account_webhooks.png)

Then create an HTTP endpoint on your server to monitor for completed payments to enable your sellers or service providers to fulfill purchases. Make sure to replace the endpoint secret key (`whsec_...`) in the example with your key.

### Testing webhooks locally

Use the Stripe CLI to test webhooks locally.

1. First, [install the Stripe CLI](https://docs.stripe.com/stripe-cli.md#install) on your machine if you haven’t already.

1. Then, to log in run `stripe login` in the command line, and follow the instructions.

1. Finally, to allow your local host to receive a simulated event on your connected account run `stripe listen --forward-to localhost:{PORT}/webhook` in one terminal window, and run stripe trigger --stripe-account={{CONNECTED_STRIPE_ACCOUNT_ID}}  (or trigger any other [supported event](https://github.com/stripe/stripe-cli/wiki/trigger-command#supported-events)) in another.

### Step 3.6: Disputes 

As the [settlement merchant](https://docs.stripe.com/connect/destination-charges.md#settlement-merchant) on charges, your platform is responsible for disputes. Make sure you understand the [best practices](https://docs.stripe.com/disputes/responding.md) for responding to disputes.

## Testing

Test your account creation flow by [creating accounts](https://docs.stripe.com/connect/testing.md#creating-accounts) and [using OAuth](https://docs.stripe.com/connect/testing.md#using-oauth). You can use [the available test cards](https://docs.stripe.com/testing.md) to test your payments flow and simulate various payment outcomes.

# React Native

> This is a React Native for when platform is react-native and mobile-ui is payment-element. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=react-native&mobile-ui=payment-element.

## Prerequisites 

## Set up Stripe

### Server-side 

This integration requires endpoints on your server that talk to the Stripe API. Use the official libraries for access to the Stripe API from your server:

```bash
\# Available as a gem
sudo gem install stripe
```

```ruby
\# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

```bash
\# Install through pip
pip3 install --upgrade stripe
```

```bash
\# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
\# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

```bash
\# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
\# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:29.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>29.0.0</version>
</dependency>
```

```bash
\# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

```bash
\# Install with npm
npm install stripe --save
```

```bash
\# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v82
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v82"
)
```

```bash
\# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
\# Or install with NuGet
Install-Package Stripe.net
```

### Client-side 

The [React Native SDK](https://github.com/stripe/stripe-react-native) is open source and fully documented. Internally, it uses the [native iOS](https://github.com/stripe/stripe-ios) and [Android](https://github.com/stripe/stripe-android) SDKs. To install Stripe’s React Native SDK, run one of the following commands in your project’s directory (depending on which package manager you use):

```bash
yarn add @stripe/stripe-react-native
```

```bash
npm install @stripe/stripe-react-native
```

Next, install some other necessary dependencies:

- For iOS, navigate to the **ios** directory and run `pod install` to ensure that you also install the required native dependencies.
- For Android, there are no more dependencies to install.

### Stripe initialization

To initialize Stripe in your React Native app, either wrap your payment screen with the `StripeProvider` component, or use the `initStripe` initialization method. Only the API [publishable key](https://docs.stripe.com/keys.md#obtain-api-keys) in `publishableKey` is required. The following example shows how to initialize Stripe using the `StripeProvider` component.

```javascript
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const key = await fetchKey(); // fetch key from your server here
    setPublishableKey(key);
  };

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.identifier" // required for Apple Pay
      urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
    >
      // Your app code here
    </StripeProvider>
  );
}
```

Use your API [test keys](https://docs.stripe.com/keys.md#obtain-api-keys) while you test and develop, and your [live mode](https://docs.stripe.com/keys.md#test-live-modes) keys when you publish your app.

## Create a connected account

When a user (seller or service provider) signs up on your platform, create a user [Account](https://docs.stripe.com/api/accounts.md) (referred to as a _connected account_) so you can accept payments and move funds to their bank account. Connected accounts represent your user in Stripe’s API and help facilitate the collection of onboarding requirements so Stripe can verify the user’s identity. In our store builder example, the connected account represents the business setting up their Internet store.

### Step 2.1: Create a connected account and prefill information  

Use the `/v1/accounts` API to [create](https://docs.stripe.com/api/accounts/create.md) a connected account by specifying the [connected account properties](https://docs.stripe.com/connect/migrate-to-controller-properties.md), or by specifying the account type.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions
{
    Controller = new AccountControllerOptions
    {
        Losses = new AccountControllerLossesOptions { Payments = "application" },
        Fees = new AccountControllerFeesOptions { Payer = "application" },
        StripeDashboard = new AccountControllerStripeDashboardOptions { Type = "express" },
    },
};
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{
  Controller: &stripe.AccountControllerParams{
    Losses: &stripe.AccountControllerLossesParams{
      Payments: stripe.String(string(stripe.AccountControllerLossesPaymentsApplication)),
    },
    Fees: &stripe.AccountControllerFeesParams{
      Payer: stripe.String(string(stripe.AccountControllerFeesPayerApplication)),
    },
    StripeDashboard: &stripe.AccountControllerStripeDashboardParams{
      Type: stripe.String(string(stripe.AccountControllerStripeDashboardTypeExpress)),
    },
  },
};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder()
    .setController(
      AccountCreateParams.Controller.builder()
        .setLosses(
          AccountCreateParams.Controller.Losses.builder()
            .setPayments(AccountCreateParams.Controller.Losses.Payments.APPLICATION)
            .build()
        )
        .setFees(
          AccountCreateParams.Controller.Fees.builder()
            .setPayer(AccountCreateParams.Controller.Fees.Payer.APPLICATION)
            .build()
        )
        .setStripeDashboard(
          AccountCreateParams.Controller.StripeDashboard.builder()
            .setType(AccountCreateParams.Controller.StripeDashboard.Type.EXPRESS)
            .build()
        )
        .build()
    )
    .build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  controller: {
    losses: {
      payments: 'application',
    },
    fees: {
      payer: 'application',
    },
    stripe_dashboard: {
      type: 'express',
    },
  },
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(
  controller={
    "losses": {"payments": "application"},
    "fees": {"payer": "application"},
    "stripe_dashboard": {"type": "express"},
  },
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create([
  'controller' => [
    'losses' => ['payments' => 'application'],
    'fees' => ['payer' => 'application'],
    'stripe_dashboard' => ['type' => 'express'],
  ],
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({
  controller: {
    losses: {payments: 'application'},
    fees: {payer: 'application'},
    stripe_dashboard: {type: 'express'},
  },
})
```

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountCreateOptions { Type = "express" };
var service = new AccountService();
Account account = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountParams{Type: stripe.String(string(stripe.AccountTypeExpress))};
result, err := account.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountCreateParams params =
  AccountCreateParams.builder().setType(AccountCreateParams.Type.EXPRESS).build();

Account account = Account.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const account = await stripe.accounts.create({
  type: 'express',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account = stripe.Account.create(type="express")
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$account = $stripe->accounts->create(['type' => 'express']);
```

```ruby
Stripe.api_key = '<<secret key>>'

account = Stripe::Account.create({type: 'express'})
```

If you’ve already collected information for your connected accounts, you can prefill that information on the `Account` object. You can prefill any account information, including personal and business information, external account information, and so on.

Connect Onboarding doesn’t ask for the prefilled information. However, it does ask the account holder to confirm the prefilled information before accepting the [Connect service agreement](https://docs.stripe.com/connect/service-agreement-types.md).

When testing your integration, prefill account information using [test data](https://docs.stripe.com/connect/testing.md).

### Step 2.2: Create an account link  

You can create an account link by calling the [Account Links](https://docs.stripe.com/api/account_links.md) API with the following parameters:

* `account`
* `refresh_url`
* `return_url`
* `type` = `account_onboarding`

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new AccountLinkCreateOptions
{
    Account = "<<connectedAccount>>",
    RefreshUrl = "https://example.com/reauth",
    ReturnUrl = "https://example.com/return",
    Type = "account_onboarding",
};
var service = new AccountLinkService();
AccountLink accountLink = service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.AccountLinkParams{
  Account: stripe.String("<<connectedAccount>>"),
  RefreshURL: stripe.String("https://example.com/reauth"),
  ReturnURL: stripe.String("https://example.com/return"),
  Type: stripe.String("account_onboarding"),
};
result, err := accountlink.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

AccountLinkCreateParams params =
  AccountLinkCreateParams.builder()
    .setAccount("<<connectedAccount>>")
    .setRefreshUrl("https://example.com/reauth")
    .setReturnUrl("https://example.com/return")
    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
    .build();

AccountLink accountLink = AccountLink.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const accountLink = await stripe.accountLinks.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

account_link = stripe.AccountLink.create(
  account="<<connectedAccount>>",
  refresh_url="https://example.com/reauth",
  return_url="https://example.com/return",
  type="account_onboarding",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$accountLink = $stripe->accountLinks->create([
  'account' => '<<connectedAccount>>',
  'refresh_url' => 'https://example.com/reauth',
  'return_url' => 'https://example.com/return',
  'type' => 'account_onboarding',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

account_link = Stripe::AccountLink.create({
  account: '<<connectedAccount>>',
  refresh_url: 'https://example.com/reauth',
  return_url: 'https://example.com/return',
  type: 'account_onboarding',
})
```

### Step 2.3: Redirect your user to the account link URL  

The response to your [Account Links](https://docs.stripe.com/api/account_links.md) request includes a value for the key `url`. Redirect to this link to send your user into the flow. URLs from the [Account Links](https://docs.stripe.com/api/account_links.md) API are temporary and are single-use only, because they grant access to the connected account user’s personal information. Authenticate the user in your application before redirecting them to this URL. If you want to prefill information, you must do so before generating the account link. After you create the account link for an Express account, you can’t read or write information for the account.

Don’t email, text, or otherwise send account link URLs outside of your platform application. Instead, provide them to the authenticated account holder within your application.

### Step 2.4: Handle the user returning to your platform  

Connect Onboarding requires you to pass both a `return_url` and `refresh_url` to handle all cases where the user is redirected to your platform. It’s important that you implement these correctly to provide the best experience for your user. You can set up a [deep link](https://reactnavigation.org/docs/deep-linking/) to enable the Stripe webpage to redirect to your app automatically.

You can use HTTP for your `return_url` and `refresh_url` while you’re in a testing environment (for example, to test with localhost), but live mode only accepts HTTPS. Be sure to swap testing URLs for HTTPS URLs before going live.

#### return_url 

Stripe issues a redirect to this URL when the user completes the Connect Onboarding flow. This doesn’t mean that all information has been collected or that there are no outstanding requirements on the account. This only means the flow was entered and exited properly.

No state is passed through this URL. After a user is redirected to your `return_url`, check the state of the `details_submitted` parameter on their account by doing either of the following:

- Listening to `account.updated` webhooks
- Calling the [Accounts](https://docs.stripe.com/api/accounts.md) API and inspecting the returned object

#### refresh_url 

Stripe redirects your user to the `refresh_url` in these cases:

- The link is expired (a few minutes went by since the link was created).
- The user already visited the URL (the user refreshed the page or clicked back or forward in the browser).
- Your platform is no longer able to access the account.
- The account has been rejected.

Your `refresh_url` should trigger a method on your server to call [Account Links](https://docs.stripe.com/api/account_links.md) again with the same parameters, and redirect the user to the Connect Onboarding flow to create a seamless experience.

### Step 2.5: Handle users that have not completed onboarding 

A user that’s redirected to your `return_url` might not have completed the onboarding process. Use the `/v1/accounts` endpoint to retrieve the user’s account and check for `charges_enabled`. If the account isn’t fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the `details_submitted` parameter on their account to see if they’ve completed the onboarding process.

## Enable payment methods

View your [payment methods settings](https://dashboard.stripe.com/settings/connect/payment_methods) and enable the payment methods you want to support. Card payments, Google Pay, and Apple Pay are enabled by default but you can enable and disable payment methods as needed.

Before the payment form is displayed, Stripe evaluates the currency, payment method restrictions, and other parameters to determine the list of supported payment methods. Payment methods that increase conversion and that are most relevant to the currency and customer’s location are prioritized. Lower priority payment methods are hidden in an overflow menu.

## Add an endpoint

## Integrate the payment sheet

Before displaying the mobile Payment Element, your checkout page should:

- Show the products being purchased and the total amount
- Collect any required shipping information
- Include a checkout button to present Stripe’s UI

In the checkout of your app, make a network request to the backend endpoint you created in the previous step and call `initPaymentSheet` from the `useStripe` hook.

```javascript
export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { paymentIntent, ephemeralKey, customer } = await response.json();

    return {
      paymentIntent,
      ephemeralKey,
      customer,
    };
  };

  const initializePaymentSheet = async () => {
    const {
      paymentIntent,
      ephemeralKey,
      customer,
    } = await fetchPaymentSheetParams();

    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      // Set `allowsDelayedPaymentMethods` to true if your business can handle payment
      //methods that complete payment after a delay, like SEPA Debit and Sofort.
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: 'Jane Doe',
      }
    });
    if (!error) {
      setLoading(true);
    }
  };

  const openPaymentSheet = async () => {
    // see below
  };

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  return (
    <Screen>
      <Button
        variant="primary"
        disabled={!loading}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </Screen>
  );
}
```

When your customer taps the **Checkout** button, call `presentPaymentSheet()` to open the sheet. After the customer completes the payment, the sheet is dismissed and the promise resolves with an optional `StripeError<PaymentSheetError>`.

```javascript
export default function CheckoutScreen() {
  // continued from above

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert('Success', 'Your order is confirmed!');
    }
  };

  return (
    <Screen>
      <Button
        variant="primary"
        disabled={!loading}
        title="Checkout"
        onPress={openPaymentSheet}
      />
    </Screen>
  );
}
```

Setting `allowsDelayedPaymentMethods` to true allows [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment methods like US bank accounts. For these payment methods, the final payment status isn’t known when the `PaymentSheet` completes, and instead succeeds or fails later. If you support these types of payment methods, inform the customer their order is confirmed and only fulfill their order (for example, ship their product) when the payment is successful.

## Set up a return URL (iOS only)

The customer might navigate away from your app to authenticate (for example, in Safari or their banking app). To allow them to automatically return to your app after authenticating, [configure a custom URL scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) and set up your app delegate to forward the URL to the SDK. Stripe doesn’t support [universal links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).

```swift
// This method handles opening custom URL schemes (for example, "your-app://stripe-redirect")
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else {
        return
    }
    let stripeHandled = StripeAPI.handleURLCallback(with: url)
    if (!stripeHandled) {
        // This was not a Stripe url – handle the URL normally as you would
    }
}

```

```swift
// This method handles opening custom URL schemes (for example, "your-app://stripe-redirect")
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    let stripeHandled = StripeAPI.handleURLCallback(with: url)
    if (stripeHandled) {
        return true
    } else {
        // This was not a Stripe url – handle the URL normally as you would
    }
    return false
}
```

```swift
@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      Text("Hello, world!")
        .onOpenURL { incomingURL in
          let stripeHandled = StripeAPI.handleURLCallback(with: incomingURL)
          if (!stripeHandled) {
            // This was not a Stripe url – handle the URL normally as you would
          }
        }
    }
  }
}
```

## Handle post-payment events

Stripe sends a [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md#event_types-payment_intent.succeeded) event when the payment completes. Use the [Dashboard webhook tool](https://dashboard.stripe.com/webhooks) or follow the [webhook guide](https://docs.stripe.com/webhooks/quickstart.md) to receive these events and run actions, such as sending an order confirmation email to your customer, logging the sale in a database, or starting a shipping workflow.

Listen for these events rather than waiting on a callback from the client. On the client, the customer could close the browser window or quit the app before the callback executes, and malicious clients could manipulate the response. Setting up your integration to listen for asynchronous events is what enables you to accept [different types of payment methods](https://stripe.com/payments/payment-methods-guide) with a single integration.

In addition to handling the `payment_intent.succeeded` event, we recommend handling these other events when collecting payments with the Payment Element:

| Event                                                                                                                           | Description                                                                                                                                                                                                                                                                         | Action                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [payment_intent.succeeded](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.succeeded)           | Sent when a customer successfully completes a payment.                                                                                                                                                                                                                              | Send the customer an order confirmation and *fulfill* their order.                                                                                                              |
| [payment_intent.processing](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.processing)         | Sent when a customer successfully initiates a payment, but the payment has yet to complete. This event is most commonly sent when the customer initiates a bank debit. It’s followed by either a `payment_intent.succeeded` or `payment_intent.payment_failed` event in the future. | Send the customer an order confirmation that indicates their payment is pending. For digital goods, you might want to fulfill the order before waiting for payment to complete. |
| [payment_intent.payment_failed](https://docs.stripe.com/api/events/types.md?lang=php#event_types-payment_intent.payment_failed) | Sent when a customer attempts a payment, but the payment fails.                                                                                                                                                                                                                     | If a payment transitions from `processing` to `payment_failed`, offer the customer another attempt to pay.                                                                      |

## Test the integration

| Card number         | Scenario                                                            | How to test                                                                                           |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4242424242424242    | The card payment succeeds and doesn’t require authentication.       | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000002500003155    | The card payment requires *authentication*.                         | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000000000009995    | The card is declined with a decline code like `insufficient_funds`. | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 6205500000000000004 | The UnionPay card has a variable length of 13-19 digits.            | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |

| Payment method | Scenario                                                                                                                                                                   | How to test                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | Your customer fails to authenticate on the redirect page for a redirect-based and immediate notification payment method.                                                   | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page. |
| Pay by Bank    | Your customer successfully pays with a redirect-based and [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method. | Choose the payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page.            |
| Pay by Bank    | Your customer fails to authenticate on the redirect page for a redirect-based and delayed notification payment method.                                                     | Choose the payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page.                |

| Payment method    | Scenario                                                                                          | How to test                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEPA Direct Debit | Your customer successfully pays with SEPA Direct Debit.                                           | Fill out the form using the account number `AT321904300235473204`. The confirmed PaymentIntent initially transitions to processing, then transitions to the succeeded status three minutes later. |
| SEPA Direct Debit | Your customer’s payment intent status transitions from `processing` to `requires_payment_method`. | Fill out the form using the account number `AT861904300235473202`.                                                                                                                                |

See [Testing](https://docs.stripe.com/testing.md) for additional information to test your integration.

## Enable Apple Pay

### Register for an Apple Merchant ID

Obtain an Apple Merchant ID by [registering for a new identifier](https://developer.apple.com/account/resources/identifiers/add/merchant) on the Apple Developer website.

Fill out the form with a description and identifier. Your description is for your own records and you can modify it in the future. Stripe recommends using the name of your app as the identifier (for example, `merchant.com.{{YOUR_APP_NAME}}`).

### Create a new Apple Pay certificate

Create a certificate for your app to encrypt payment data.

Go to the [iOS Certificate Settings](https://dashboard.stripe.com/settings/ios_certificates) in the Dashboard, click **Add new application**, and follow the guide.

Download a Certificate Signing Request (CSR) file to get a secure certificate from Apple that allows you to use Apple Pay.

One CSR file must be used to issue exactly one certificate. If you switch your Apple Merchant ID, you must go to the [iOS Certificate Settings](https://dashboard.stripe.com/settings/ios_certificates) in the Dashboard to obtain a new CSR and certificate.

### Integrate with Xcode

Add the Apple Pay capability to your app. In Xcode, open your project settings, click the **Signing & Capabilities** tab, and add the **Apple Pay** capability. You might be prompted to log in to your developer account at this point. Select the merchant ID you created earlier, and your app is ready to accept Apple Pay.

![](images/mobile/ios/xcode.png)
Enable the Apple Pay capability in Xcode


### Add Apple Pay

When you call `initPaymentSheet`, pass in an [ApplePayParams](https://stripe.dev/stripe-react-native/api-reference/modules/PaymentSheet.html#ApplePayParams) with `merchantCountryCode` set to the [country code of your business](https://dashboard.stripe.com/settings/account).

In accordance with [Apple’s guidelines](https://developer.apple.com/design/human-interface-guidelines/apple-pay#Supporting-subscriptions) for recurring payments, you must also set a `cardItems` that includes a [RecurringCartSummaryItem](https://stripe.dev/stripe-react-native/api-reference/modules/ApplePay.html#RecurringCartSummaryItem) with the amount you intend to charge (for example, “$59.95 a month”).

You can also adopt [merchant tokens](https://developer.apple.com/apple-pay/merchant-tokens/) by setting the `request` with its `type` set to `PaymentRequestType.Recurring`

To learn more about how to use recurring payments with Apple Pay, see [Apple’s PassKit documentation](https://developer.apple.com/documentation/passkit/pkpaymentrequest).

```javascript
const initializePaymentSheet = async () => {
  const recurringSummaryItem = {
    label: 'My Subscription',
    amount: '59.99',
    paymentType: 'Recurring',
    intervalCount: 1,
    intervalUnit: 'month',
    // Payment starts today
    startDate: new Date().getTime() / 1000,

    // Payment ends in one year
    endDate: new Date().getTime() / 1000 + 60 * 60 * 24 * 365,
  };

  const {error} = await initPaymentSheet({
    // ...
    applePay: {
      merchantCountryCode: 'US',
      cartItems: [recurringSummaryItem],
      request: {
        type: PaymentRequestType.Recurring,
        description: 'Recurring',
        managementUrl: 'https://my-backend.example.com/customer-portal',
        billing: recurringSummaryItem,
        billingAgreement:
          "You'll be billed $59.99 every month for the next 12 months. To cancel at any time, go to Account and click 'Cancel Membership.'",
      },
    },
  });
};
```

### Order tracking

To add [order tracking](https://developer.apple.com/design/human-interface-guidelines/technologies/wallet/designing-order-tracking) information in iOS 16 or later, configure a `setOrderTracking` callback function. Stripe calls your implementation after the payment is complete, but before iOS dismisses the Apple Pay sheet.

In your implementation of `setOrderTracking` callback function, fetch the order details from your server for the completed order, and pass the details to the provided `completion` function.

To learn more about order tracking, see [Apple’s Wallet Orders documentation](https://developer.apple.com/documentation/walletorders).

```javascript
await initPaymentSheet({
  // ...
  applePay: {
    // ...
    setOrderTracking: async complete => {
      const apiEndpoint =
        Platform.OS === 'ios'
          ? 'http://localhost:4242'
          : 'http://10.0.2.2:4567';
      const response = await fetch(
        `${apiEndpoint}/retrieve-order?orderId=${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.status === 200) {
        const orderDetails = await response.json();
        // orderDetails should include orderIdentifier, orderTypeIdentifier,
        // authenticationToken and webServiceUrl
        complete(orderDetails);
      }
    },
  },
});
```

## Enable Google Pay

### Set up your integration

To use Google Pay, first enable the Google Pay API by adding the following to the `<application>` tag of your **AndroidManifest.xml**:

```xml
<application>
  ...
  <meta-data
    android:name="com.google.android.gms.wallet.api.enabled"
    android:value="true" />
</application>
```

This guide assumes you’re using the latest version of the Stripe Android SDK.

```groovy
dependencies {
    implementation 'com.stripe:stripe-android:21.11.1'
}
```

```kotlin
dependencies {
    implementation("com.stripe:stripe-android:21.11.1")
}
```

For more details, see Google Pay’s [Set up Google Pay API](https://developers.google.com/pay/api/android/guides/setup) for Android.

### Add Google Pay

When you initialize `PaymentSheet`, pass a `merchantCountryCode` (check your account details [here](https://dashboard.stripe.com/settings/account)) and set `googlePay` to `true`.

You can also pass the `testEnv` property to use the test environment. Google Pay can only be tested on a physical Android device. Follow the [React Native docs](https://reactnative.dev/docs/running-on-device) to test your application on a physical device.

```javascript
const { error, paymentOption } = await initPaymentSheet({
  // ...
  googlePay: {
    merchantCountryCode: 'US',
    testEnv: true, // use test environment
  },
});
```

## Enable card scanning (iOS only)

To enable card scanning support, set the `NSCameraUsageDescription` (**Privacy - Camera Usage Description**) in the Info.plist of your application, and provide a reason for accessing the camera (for example, “To scan cards”). Devices with iOS 13 or higher support card scanning.

## Customize the sheet

All customization is configured using `initPaymentSheet`.

### Appearance

Customize colors, fonts, and so on to match the look and feel of your app by using the [appearance API](https://docs.stripe.com/elements/appearance-api.md?platform=react-native).

### Merchant display name

Specify a customer-facing business name by setting `merchantDisplayName`. By default, this is your app’s name.

```javascript
await initPaymentSheet({
  // ...
  merchantDisplayName: 'Example Inc.',
});
```

### Dark mode

By default, `PaymentSheet` automatically adapts to the user’s system-wide appearance settings (light and dark mode). You can change this by setting the `style` property to `alwaysLight` or `alwaysDark` mode on iOS.

```javascript
await initPaymentSheet({
  // ...
  style: 'alwaysDark',
});
```

On Android, set light or dark mode on your app:

```
// force dark
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
// force light
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
```

## Complete payment in your UI

You can present Payment Sheet to only collect payment method details and then later call a `confirm` method to complete payment in your app’s UI. This is useful if you have a custom buy button or require additional steps after payment details are collected.

![](images/mobile/payment-sheet/react-native-multi-step.png)

A sample integration is [available on our GitHub](https://github.com/stripe/stripe-react-native/blob/master/example/src/screens/PaymentsUICustomScreen.tsx).

1. First, call `initPaymentSheet` and pass `customFlow: true`. `initPaymentSheet` resolves with an initial payment option containing an image and label representing the customer’s payment method. Update your UI with these details.

```javascript
const {
  initPaymentSheet,
  presentPaymentSheet,
  confirmPaymentSheetPayment,
} = useStripe()

const { error, paymentOption } = await initPaymentSheet({
  customerId: customer,
  customerEphemeralKeySecret: ephemeralKey,
  paymentIntentClientSecret: paymentIntent,
  customFlow: true,
  merchantDisplayName: 'Example Inc.',
});
// Update your UI with paymentOption
```

2. Use `presentPaymentSheet` to collect payment details. When the customer finishes, the sheet dismisses itself and resolves the promise. Update your UI with the selected payment method details.

```javascript
const { error, paymentOption } = await presentPaymentSheet();
```

3. Use `confirmPaymentSheetPayment` to confirm the payment. This resolves with the result of the payment.

```javascript
const { error } = await confirmPaymentSheetPayment();

if (error) {
  Alert.alert(`Error code: ${error.code}`, error.message);
} else {
  Alert.alert(
    'Success',
    'Your order is confirmed!'
  );
}
```

Setting `allowsDelayedPaymentMethods` to true allows [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment methods like US bank accounts. For these payment methods, the final payment status isn’t known when the `PaymentSheet` completes, and instead succeeds or fails later. If you support these types of payment methods, inform the customer their order is confirmed and only fulfill their order (for example, ship their product) when the payment is successful.

# No code

> This is a No code for when platform is no-code. View the original doc at https://docs.stripe.com/connect/collect-then-transfer-guide?platform=no-code.

This guide demonstrates how to accept payments from customers and move funds to the bank accounts of your sellers or service providers, without writing code. Use this guide if you:

* Want to accept payments from customers and pay out sellers or service providers without writing code.
* Want to rapidly test product-market fit without coding.
* Are a marketplace that is selling directly to end customers (as opposed to a SaaS platform who is selling software to help others operate their own business).

In this example, we’ll build a marketplace that allows T-shirt artists to sell customized T-shirts. You can use the concepts covered in this guide in other business applications as well.

## Prerequisites

## Create a connected account

When a seller or service provider signs up on your marketplace, you need to create a user account (referred to as a *connected account*) so you can move funds to their bank account. Connected accounts represent your sellers or service providers. In our T-shirt marketplace example, the connected account represents the artist making the shirts.

### Step 1.1: Create a connected account onboarding link 

* Go to the [accounts overview page](https://dashboard.stripe.com/connect/accounts/overview) and click **+Create** to create a new connected account.
* Select **Express** for account type and select the country where this connected account is located. Stripe allows platforms in supported countries to [create connected accounts in other Stripe-supported countries](https://docs.stripe.com/connect/express-accounts.md#onboarding-express-accounts-outside-of-your-platforms-country).
* Click **Continue** to generate the onboarding link that you can then share with your seller or service provider over email, SMS, or other private means. Don’t share this link publicly.

![The create account modal displaying a generated Express link for onboarding a connected account](images/connect/no-code-connect-express-link.png)
Create an onboarding link


This link directs sellers and service providers to a sign-up form where they can provide their identity and bank account information to onboard to your marketplace. In our example of a T-shirt marketplace, share this link with the T-shirt artist to onboard them. This link expires after 90 days and is for use by a single seller or service provider. After they complete the onboarding flow, you can see their account details in your [accounts list](https://dashboard.stripe.com/connect/accounts/overview). Repeat these steps any time you need to add additional sellers or service providers.

![A single account displayed in the connected accounts list view](images/connect/no-code-connect-connected-accounts.png)

## Create the Payment Link to accept payments

Now that you’ve created a connected account, create a Payment Link to accept payments from your customers—no coding required. When you send this link to your marketplace customer, they’ll land on a Stripe-hosted page where they can pay you. In the T-shirt marketplace example, customers buy T-shirts through your marketplace, and you pay T-shirt artists for designing and creating the T-shirts. To set this up, click on **+Create link** on the [Payment Links page](https://dashboard.stripe.com/payment-links) and follow the steps.

### Step 2.1: Add the product 

You configure Payment Links for a specific product and price so the first step is to [add the product](https://support.stripe.com/questions/how-to-create-products-and-prices) you want to sell. Click on **+Add new product** to add a product.

![The first page of the payment link creation form](images/connect/no-code-connect-empty-payment-link.png)

Set your product name, description, and price, which are all visible to the customer on the Checkout page that you redirect them to. After entering the information for your new product click **+Add product** to add the product. In this example, we’re adding a medium-sized tree-patterned T-shirt product, so we’ll configure the Payment Link for this particular product. If we also wanted to sell small-sized T-shirts or T-shirts with other designs, we would follow the above steps to create a new Payment Link and a new product.

![The product creation modal found within the payment link creation form](images/connect/no-code-connect-create-product.png)

### Step 2.2: Customize the Payment Link 

You can customize your Payment Link to allow customers to enter promotion codes, adjust the quantity of the product, or enter their shipping and billing address. For our example of a T-shirt marketplace, we want to allow customers to buy a variable number of T-shirts. We also need to collect the customer’s shipping address so we can ship the T-shirts to them. To enable both of these, select **Let customers adjust quantity** and **Collect customers’ addresses** then click **Next**.

### Step 2.3: Decide when to pay your connected account 

You have two options for paying out your connected account.

* If you already know which connected account you want to pay using funds collected through this Payment Link, you can automatically pay out.
* However, if you don’t know the connected account ahead of time or need to pay multiple connected accounts, you can pay out later.

#### Select the connected account to pay

Select the checkbox that says **Split the payment with a connected account**. Selecting this checkbox allows a connected account to automatically get paid when a customer buys the product through this Payment Link. In our example, we want to automatically pay Jamie, the T-shirt artist, whenever a customer buys their T-shirt. To do that, we specify Jamie as the connected account.

#### Specify the application fee for the platform 

To keep a portion of the payment for your marketplace, you can specify an application fee. This is a fixed amount for each payment that uses this payment link. It doesn’t change based on quantity, discounts, or taxes, and we cap it at the total purchase amount. In our example, our T-shirt marketplace takes a 1 USD application fee per sale and sends the remaining payment (9 USD) to the T-shirt artist. If the customer purchases two T-shirts, uses a promotion code, or needs to pay additional taxes on top of their 10 USD purchase, the T-shirt marketplace still receives a 1 USD application fee per sale. For products with recurring payments (subscriptions), you can specify an application fee as a percentage of the total transaction value.

![The second page of the payment link creation form. This page includes options for routing funds to connected accounts.](images/connect/no-code-connect-create-payment-link-page-2.png)

After configuring the Payment Link to split the payment with your connected account, click **+Create link** to generate the Payment Link URL.

After the customer pays, Stripe transfers the entire amount to the connected account’s pending balance and then transfers the application fee amount to the platform’s account as revenue for facilitating the sale. Then Stripe deducts the Stripe fees from the platform’s application fee. Under the hood, this funds flow is called a [destination charge](https://docs.stripe.com/connect/destination-charges.md).

#### Pay your connected account at a later time

In some cases you may prefer to manually transfer funds to a connected account at a later time instead of automatically at the time of purchase. This might happen if you don’t yet know which connected account should receive the funds, or if you need to pay multiple connected accounts for a single sale. For example:

* You sell a T-shirt that’s a collaboration between two artists who should each receive half of the funds.
* You sell a T-shirt that can be fulfilled by one of several artists, and you don’t yet know who will fulfill the order.

To create the Payment Link to accept payment from customers, make sure that you _don’t_ check **Split the payment with a connected account**, and then click **Create link** to generate your Payment Link. When you’re ready to pay your connected account, go to the **Balance** section of the connected account’s detail page and click **Send funds**. Under the hood, this funds flow is called a [Separate Charge and Transfer](https://docs.stripe.com/connect/separate-charges-and-transfers.md).

## Share the Payment Link with your customers

Now that you’ve created your Payment Link, copy the Payment Link URL and share it publicly on your website or through social media. When a customer clicks on your Payment Link URL, they see your customized Checkout page (example below) and can enter their payment information—they can pay from mobile or desktop with a card, Apple Pay, or Google Pay.

## After the payment

### Step 4.1 View your payments 

Go to the [Payments page](https://dashboard.stripe.com/payments) to see the list of payments your business has accepted. You can click on an individual payment to see more details about it, such as the shipping address if you chose to collect one. You can see the [application fees](https://dashboard.stripe.com/connect/application_fees) your business collected for each payment, or go to the [Balance page](https://dashboard.stripe.com/balance/overview) to see your total funds.

### Step 4.2 Fulfillment 

After the payment completes, you need to handle *fulfillment* of the product. In the T-shirt marketplace example, this would entail shipping the T-shirts to the buyer after payment.

## Add more payment methods

Payment Links supports [more than 20 payment methods](https://docs.stripe.com/payments/payment-methods/payment-method-support.md#product-support). You can enable payment methods in your [Payment methods settings](https://dashboard.stripe.com/settings/payment_methods). After you enable payment methods, Stripe dynamically shows the payment methods most likely to increase conversion and most relevant to the currency and customer’s location.

Stripe introduced support for more payment methods on January 25, 2022.  Payment links created prior to this date only support card payments and wallets. Create a new link to enable more payment methods.

Some payment methods, such as bank debits or vouchers, take 2-14 days to confirm the payment. Use webhooks to notify you when payment clears so you can start fulfillment. See our [fulfillment guide](https://docs.stripe.com/checkout/fulfillment.md#create-payment-event-handler).

## Disputes

As the [settlement merchant](https://docs.stripe.com/connect/destination-charges.md#settlement-merchant) on charges, your platform is responsible for disputes. Make sure you understand the [best practices](https://docs.stripe.com/disputes/responding.md) for responding to disputes.

## Payouts

By default, any funds that you transfer to a connected account accumulate in the connected account’s [Stripe balance](https://docs.stripe.com/connect/account-balances.md) and are paid out on a daily rolling basis. You can change the *payout* frequency by going into the connected account’s detail page, clicking the right-most button in the **Balance** section, and selecting **Edit payout schedule**.

## Refunds 

To issue refunds, go to the [Payments](https://dashboard.stripe.com/payments) page. Select individual payments by clicking the checkbox to the left of any payments you want to refund. After you select a payment, Stripe displays a **Refund** button in the upper-right corner of the page. Click the **Refund** button to issue a refund to customers for all payments you have selected.

Connected accounts can’t initiate refunds for payments from the [Express Dashboard](https://docs.stripe.com/connect/express-dashboard.md). If your connected accounts use the Express Dashboard, you must process refunds for them.

## See Also

* [Manage connected accounts in the Dashboard](https://docs.stripe.com/connect/dashboard.md)
* [Issue refunds](https://docs.stripe.com/connect/direct-charges.md#issue-refunds)
* [Customize statement descriptors](https://docs.stripe.com/connect/statement-descriptors.md)
* [Work with multiple currencies](https://docs.stripe.com/connect/currencies.md)