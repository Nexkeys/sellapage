A [Google Ads campaign](https://support.google.com/google-ads/answer/6304) is a set
of one or more ad groups (ads, keywords, and bids) that share a
budget, location targeting, and other settings.
Campaigns are typically used to organize categories of products or
services offered by an advertiser. Campaigns are the top-level organizational
tool within your Google Ads account.

<br />

[Video](https://www.youtube.com/watch?v=U9w4ezph05A)

<br />

Items that can be set at the campaign level include bids,
budget, language, location, distribution for the Google Network,
and more. Large advertisers typically create separate ad campaigns
to run ads in different locations or using different budgets.

While we recommend using our [client libraries](https://developers.google.com/google-ads/api/docs/client-libs), you can
also
[modify campaigns with the REST endpoint](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignService/MutateCampaigns).

## Campaign types

In Google Ads, think of these concepts in a hierarchy:

1. **[Campaign Type](https://support.google.com/google-ads/answer/2567043)**: Your primary choice. The blueprint for your entire campaign.
2. **Advertising Networks**: The places where your ads can run, largely determined by your Campaign Type.
3. **Network/Channel Controls**: The specific settings you can use to fine-tune where your ads appear within those networks. This is where it gets more complex, as the tool you use depends on the campaign type.

### Start with the campaign type (the "what" and "how")

The Campaign Type is the foundation of your advertising efforts. It's the first
decision you make and it dictates everything else, including:

- What kind of ads you can create (for example, text ads, image banners, video ads).
- What features and bidding strategies are available.

Examples of Campaign Types include **Search, Display, Performance Max** , and
**Demand Gen.**

Each campaign targets one campaign type, known in the API as the
[`AdvertisingChannelType`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#advertising_channel_type)
field. This field is on the [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign) object.

The API supports the following campaign types:

- [Display Network only](https://support.google.com/google-ads/answer/2404190)
- [Search Network only](https://support.google.com/google-ads/answer/1722047)
- [Display Expansion on Search](https://support.google.com/google-ads/answer/7193800)
- [App campaigns](https://developers.google.com/google-ads/api/docs/app-campaigns/overview)
- [Call-only](https://support.google.com/adspolicy/answer/6130299)
- [Demand Gen](https://developers.google.com/google-ads/api/docs/demand-gen/overview)
- [Performance Max](https://developers.google.com/google-ads/api/performance-max)
- [Shopping campaigns](https://developers.google.com/google-ads/api/docs/shopping-ads/create-campaign)
- [Local Services](https://developers.google.com/google-ads/api/docs/campaigns/local-service-campaigns)

### Understand the networks (the "where")

The Advertising Networks are the collections of websites, apps, and properties
where your ads can be shown. The main ones are:

- **Google Search Network:** Google Search, Google Maps, and Search Partner sites.
- **Google Display Network:** Millions of third-party websites, news sites, blogs, and Google properties like Gmail and YouTube that show visual ads.
- **YouTube Network:** YouTube itself, including the home feed, search results, videos, and shorts.

Each Campaign Type is designed to serve ads on specific networks.
For example, a Search campaign is built primarily for the Search Network.

### Control placements (the complex part)

How you control which networks your campaign uses varies significantly by the
campaign type you chose. Here's a breakdown:

| Example Campaign Type | How You Control Where Ads Show | Explanation |
|---|---|---|
| **Search** | **Uses [`NetworkSettings`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#network_settings)** | This is the "classic" model. You can use the `NetworkSettings` field to explicitly include or exclude the Google Search Partners and the Google Display Network from your Search campaign. |
| **Performance Max (PMax)** | **No Manual Control** | PMax is designed for maximum reach and automation. It automatically serves your ads across **all** of Google's networks (for example, Search, Display, and YouTube) to find conversions. You cannot opt out of specific networks. |
| **Demand Gen** | **Uses ["Channel Controls"](https://developers.google.com/google-ads/api/docs/demand-gen/channel-controls)** | This newer campaign type uses its own system. Instead of broad "network" settings, you get more specific ["channel" controls](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup.DemandGenAdGroupSettings.DemandGenChannelControls#channel_configuration) that let you opt in or out of specific part of networks. |

### In summary: an analogy

Think of it like choosing a vehicle:

- **Campaign Type = The vehicle you buy.** (for example, a city car, an off-road truck, or a high-tech self-driving shuttle).
- **Networks = The terrain the vehicle is designed for.** (for example, paved city roads, rugged mountain trails, or all of the above).
- **Network/Channel Controls = The specific features you can adjust.**
  - A **Search campaign** (city car) lets you use `NetworkSettings` to choose whether you also want to drive on the "suburban roads" (Search Partners).
  - A **Performance Max campaign** (self-driving shuttle) handles all the navigation automatically to get to the destination. You don't touch the steering wheel.
  - A **Demand Gen campaign** (off-road truck) has special controls like "4-wheel drive" or "hill descent" ([`ChannelControls`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup.DemandGenAdGroupSettings.DemandGenChannelControls)) for handling specific types of terrain within its off-road environment.

## Differences from the Google Ads UI

The Google Ads API has limitations for managing legacy and video campaigns.

For video campaigns, you can use the Google Ads API to read data. You can pull
performance reports (clicks, views, cost) for all video campaigns using the
Google Ads API.

For some specific video campaign types, you cannot write changes with the
Google Ads API. You can't use the API to make changes like pausing, enabling, changing
targeting, or adding new ads. These campaigns must be edited in the Google Ads web
interface.

Best Practice: To fully create and manage video ads on YouTube using the API,
you should use
[Performance Max](https://support.google.com/google-ads/answer/14528532)
or [Demand Gen campaigns](https://support.google.com/google-ads/answer/13704860).
These are fully supported for both reporting and management.

The Google Ads UI Objective ("Sales", "Leads") is a setup wizard. It asks for
your goal and then automatically suggests and pre-fills the best settings for
you, such as the campaign type, bidding strategy, and more.

The Google Ads API gives you the raw building blocks for campaigns. There is no
single "objective" field because the API assumes you want full control. You
achieve your objective by assembling the right building blocks yourself.

For example, to create a "Sales" campaign with the API, there is no field to set
an `objective = 'SALES'`. Instead, you build it by combining the right settings:

- Choose a Campaign Type: Set `advertising_channel_type` = "SEARCH" or
  "PERFORMANCE_MAX".

- Choose a Bidding Strategy: Set
  [`campaign_bidding_strategy`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#campaign_bidding_strategy)
  = ["MAXIMIZE_CONVERSION_VALUE"](https://developers.google.com/google-ads/api/reference/rpc/v25/MaximizeConversionValue)
  with a `target_roas` field set.

- Set Conversion Goals: Tell the campaign to specifically optimize for your
  "Purchase" [conversion actions](https://developers.google.com/google-ads/api/docs/conversions/categories).

Another common inquiry is how to represent Campaign types in the API. Campaign
types are represented in the API by the
[`AdvertisingChannelType`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#advertising_channel_type)
field. Set the `AdvertisingChannelType` for every campaign. Then, check the
onboarding guides for the specific campaign you're building
(like "PMax for Travel" or "Demand Gen") to see if it also requires you to set
the
[`AdvertisingChannelSubType`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#advertising_channel_sub_type).

A helpful table:

| If you want to create this campaign... | Set AdvertisingChannelType to... | And set AdvertisingChannelSubType to... |
|---|---|---|
| A Standard Search Campaign | SEARCH | (Do not set / Leave empty) |
| A Standard Display Campaign | DISPLAY | (Do not set / Leave empty) |
| A Standard Performance Max Campaign | PERFORMANCE_MAX | (Do not set / Leave empty) |
| A Performance Max for Travel Goals Campaign | PERFORMANCE_MAX | TRAVEL_GOALS |
| A Demand Gen Campaign | DEMAND_GEN | (Do not set / Leave empty) |

#### Campaign subtypes

**Campaign subtypes** in the Google Ads UI, such as **Standard** and
**All features** , help UI users find relevant campaign options, but there is no
corresponding attribute in the API's [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign)
object.

This UI column is *similar* to the
[`AdvertisingChannelType`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#advertising_channel_type) and
[`AdvertisingChannelSubType`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#advertising_channel_sub_type)
fields in the API, but there is not a one-to-one mapping between these fields
and **Campaign subtype** in the UI.

For example, a Search-only campaign created using the API will always be an
**All features** campaign from the UI perspective.

## Campaign budget, bidding strategies, and targeting

In the Google Ads API, managing a campaign means answering three fundamental questions
that control how and where your ads appear:

1. **How much can I spend? ([Campaign Budget](https://developers.google.com/google-ads/api/docs/campaigns/budgets/overview))**

   - This is your campaign's financial boundary. In the API, you create a separate [`CampaignBudget`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignBudget) object with a daily spending limit (in micros) and then attach its resource name to your campaign. A single budget can be shared across multiple campaigns.
2. **How should Google spend my money? ([Bidding Strategy](https://developers.google.com/google-ads/api/docs/campaigns/bidding/overview))**

   - This is the strategic "brain" of your campaign. It tells Google what your primary goal is. You choose a bidding strategy based on what you want to achieve:
     - For traffic: Use `MaximizeClicks`.
     - For leads/sign-ups: Use `MaximizeConversions` with a `TargetCpa`.
     - For ecommerce sales: Use `MaximizeConversionValue` with a `TargetRoas`.
3. **Who should see my ads? ([Target Audience](https://developers.google.com/google-ads/api/docs/targeting/overview))**

   - This is where you define your market. You add [`CampaignCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion) or [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion) objects to narrow your reach to the right people. Targeting can be based on:
     - Keywords: What users are searching for.
     - Locations: Where users are located.
     - Demographics: Their age, gender, etc.
     - Audiences: Their past behavior (for example, website visitors) or interests.

## How to think about campaigns

When you manage or build campaigns with the Google Ads API, it's
helpful to understand the underlying structure and models that govern how
campaigns, ads, and assets are organized and served. There are three primary
models to be aware of: the Ad Group and Ad model, the Asset Group and Asset
model, and a hybrid model of Ad Groups and Ads alongside Assets. These models
depend on the type of `AdvertisingChannelType` you choose.

### Google Ads API campaign structures

| Structure | Example Use (AdvertisingChannelType) | How it Works | Key Concept |
|---|---|---|---|
| [**Ad Group Structure**](https://developers.google.com/google-ads/api/docs/concepts/api-structure#object_hierarchy) | `SEARCH`, Standard `DISPLAY` | The campaign is organized into [**Ad Groups**](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup). Each Ad Group contains a set of finished ads and a set of targeting criteria (for example, keywords, audiences). | The link between manually created ads and their targeting is tightly controlled within the Ad Group. |
| [**Asset Group Structure**](https://developers.google.com/google-ads/api/performance-max/asset-groups) | `PERFORMANCE_MAX` | Instead of Ad Groups, you create **Asset Groups**. Each Asset Group contains a pool of raw creative assets (headlines, images, etc.) and audience signals. | You provide the creative components, and Google's AI assembles the final ads in real-time to optimize them across different channels. |
| **Hybrid Structure** | `DEMAND_GEN`, `DISPLAY` | This involves a standard Ad Group structure with modern [**Assets**](https://developers.google.com/google-ads/api/docs/assets/overview) (formerly extensions like Sitelinks or Callouts) linked at the campaign or ad group level. | The core ad is manually created, but you provide extra, interchangeable assets for Google to show alongside it to enhance performance. |

## Add campaigns

The best way to set up new campaigns in the API is to use the **Add Campaigns**
[code example](https://developers.google.com/google-ads/api/docs/client-libs) in the **Basic Operations** folder of your
client library. The sample handles all the background authentication tasks for
you and walks you through the settings required for establishing a new campaign,
including the budget, bidding strategy, campaign type, start \& end dates, and
more.

## Display Expansion on Search campaigns

[Display Expansion on Search
campaigns](https://support.google.com/google-ads/answer/7193800) can help you get
additional conversions on the Google Display Network using unspent Search
budgets at similar cost per conversion as Search. You can enable Display
Expansion on Search campaigns by setting the
[`target_content_network`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign.NetworkSettings#target_content_network)
field of the campaign's
[`network_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign#network_settings) to `true`.

The sample creates a shared [`CampaignBudget`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignBudget)
for use with the new campaign. Check out the
[campaign budgets guide](https://developers.google.com/google-ads/api/docs/campaigns/budgets/overview) for other budget
options.


### Java

```java
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.ads.googleads.examples.basicoperations;

import static com.google.ads.googleads.examples.utils.CodeSampleHelper.getPrintableDateTime;
import static com.google.ads.googleads.v24.enums.EuPoliticalAdvertisingStatusEnum.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING;

import com.beust.jcommander.Parameter;
import com.google.ads.googleads.examples.utils.ArgumentNames;
import com.google.ads.googleads.examples.utils.CodeSampleParams;
import com.google.ads.googleads.lib.GoogleAdsClient;
import com.google.ads.googleads.v24.common.ManualCpc;
import com.google.ads.googleads.v24.enums.AdvertisingChannelTypeEnum.AdvertisingChannelType;
import com.google.ads.googleads.v24.enums.BudgetDeliveryMethodEnum.BudgetDeliveryMethod;
import com.google.ads.googleads.v24.enums.CampaignStatusEnum.CampaignStatus;
import com.google.ads.googleads.v24.errors.GoogleAdsError;
import com.google.ads.googleads.v24.errors.GoogleAdsException;
import com.google.ads.googleads.v24.resources.Campaign;
import com.google.ads.googleads.v24.resources.Campaign.NetworkSettings;
import com.google.ads.googleads.v24.resources.CampaignBudget;
import com.google.ads.googleads.v24.services.CampaignBudgetOperation;
import com.google.ads.googleads.v24.services.CampaignBudgetServiceClient;
import com.google.ads.googleads.v24.services.CampaignOperation;
import com.google.ads.googleads.v24.services.CampaignServiceClient;
import com.google.ads.googleads.v24.services.MutateCampaignBudgetsResponse;
import com.google.ads.googleads.v24.services.MutateCampaignResult;
import com.google.ads.googleads.v24.services.MutateCampaignsResponse;
import com.google.common.collect.ImmutableList;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.joda.time.DateTime;

/** Adds new campaigns to a client account. */
public class AddCampaigns {

  /** The number of campaigns this example will add. */
  private static final int NUMBER_OF_CAMPAIGNS_TO_ADD = 2;

  private static class AddCampaignsParams extends CodeSampleParams {

    @Parameter(names = ArgumentNames.CUSTOMER_ID, required = true)
    private Long customerId;
  }

  public static void main(String[] args) {
    AddCampaignsParams params = new AddCampaignsParams();
    if (!params.parseArguments(args)) {

      // Either pass the required parameters for this example on the command line, or insert them
      // into the code here. See the parameter class definition above for descriptions.
      params.customerId = Long.parseLong("INSERT_CUSTOMER_ID_HERE");
    }

    GoogleAdsClient googleAdsClient = null;
    try {
      googleAdsClient = GoogleAdsClient.newBuilder().fromPropertiesFile().build();
    } catch (FileNotFoundException fnfe) {
      System.err.printf(
          "Failed to load GoogleAdsClient configuration from file. Exception: %s%n", fnfe);
      System.exit(1);
    } catch (IOException ioe) {
      System.err.printf("Failed to create GoogleAdsClient. Exception: %s%n", ioe);
      System.exit(1);
    }

    try {
      new AddCampaigns().runExample(googleAdsClient, params.customerId);
    } catch (GoogleAdsException gae) {
      // GoogleAdsException is the base class for most exceptions thrown by an API request.
      // Instances of this exception have a message and a GoogleAdsFailure that contains a
      // collection of GoogleAdsErrors that indicate the underlying causes of the
      // GoogleAdsException.
      System.err.printf(
          "Request ID %s failed due to GoogleAdsException. Underlying errors:%n",
          gae.getRequestId());
      int i = 0;
      for (GoogleAdsError googleAdsError : gae.getGoogleAdsFailure().getErrorsList()) {
        System.err.printf("  Error %d: %s%n", i++, googleAdsError);
      }
      System.exit(1);
    }
  }

  /**
   * Creates a new CampaignBudget in the specified client account.
   *
   * @param googleAdsClient the Google Ads API client.
   * @param customerId the client customer ID.
   * @return resource name of the newly created budget.
   * @throws GoogleAdsException if an API request failed with one or more service errors.
   */
  private static String addCampaignBudget(GoogleAdsClient googleAdsClient, long customerId) {
    CampaignBudget budget =
        CampaignBudget.newBuilder()
            .setName("Interplanetary Cruise Budget #" + getPrintableDateTime())
            .setDeliveryMethod(BudgetDeliveryMethod.STANDARD)
            .setAmountMicros(500_000)
            .build();

    CampaignBudgetOperation op = CampaignBudgetOperation.newBuilder().setCreate(budget).build();

    try (CampaignBudgetServiceClient campaignBudgetServiceClient =
        googleAdsClient.getLatestVersion().createCampaignBudgetServiceClient()) {
      MutateCampaignBudgetsResponse response =
          campaignBudgetServiceClient.mutateCampaignBudgets(
              Long.toString(customerId), ImmutableList.of(op));
      String budgetResourceName = response.getResults(0).getResourceName();
      System.out.printf("Added budget: %s%n", budgetResourceName);
      return budgetResourceName;
    }
  }

  /**
   * Runs the example.
   *
   * @param googleAdsClient the Google Ads API client.
   * @param customerId the client customer ID.
   * @throws GoogleAdsException if an API request failed with one or more service errors.
   */
  private void runExample(GoogleAdsClient googleAdsClient, long customerId) {

    // Creates a single shared budget to be used by the campaigns added below.
    String budgetResourceName = addCampaignBudget(googleAdsClient, customerId);

    List<CampaignOperation> operations = new ArrayList<>(NUMBER_OF_CAMPAIGNS_TO_ADD);

    for (int i = 0; i < NUMBER_OF_CAMPAIGNS_TO_ADD; i++) {
      // Configures the campaign network options
      NetworkSettings networkSettings =
          NetworkSettings.newBuilder()
              .setTargetGoogleSearch(true)
              .setTargetSearchNetwork(true)
              // Enables Display Expansion on Search campaigns. See
              // https://support.google.com/google-ads/answer/7193800 to learn more.
              .setTargetContentNetwork(true)
              .setTargetPartnerSearchNetwork(false)
              .build();

      // Creates the campaign.
      Campaign campaign =
          Campaign.newBuilder()
              .setName("Interplanetary Cruise #" + getPrintableDateTime())
              .setAdvertisingChannelType(AdvertisingChannelType.SEARCH)
              // Recommendation: Set the campaign to PAUSED when creating it to prevent
              // the ads from immediately serving. Set to ENABLED once you've added
              // targeting and the ads are ready to serve
              .setStatus(CampaignStatus.PAUSED)
              // Sets the bidding strategy and budget.
              .setManualCpc(ManualCpc.newBuilder().build())
              .setCampaignBudget(budgetResourceName)
              // Adds the networkSettings configured above.
              .setNetworkSettings(networkSettings)
              // Declares whether this campaign serves political ads targeting the EU.
              .setContainsEuPoliticalAdvertising(DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING)
              // Optional: Sets the start & end dates.
              .setStartDateTime(new DateTime().plusDays(1).toString("yyyy-MM-dd 00:00:00"))
              .setEndDateTime(new DateTime().plusDays(30).toString("yyyy-MM-dd 23:59:59"))
              .build();

      CampaignOperation op = CampaignOperation.newBuilder().setCreate(campaign).build();
      operations.add(op);
    }

    try (CampaignServiceClient campaignServiceClient =
        googleAdsClient.getLatestVersion().createCampaignServiceClient()) {
      MutateCampaignsResponse response =
          campaignServiceClient.mutateCampaigns(Long.toString(customerId), operations);
      System.out.printf("Added %d campaigns:%n", response.getResultsCount());
      for (MutateCampaignResult result : response.getResultsList()) {
        System.out.println(result.getResourceName());
      }
    }
  }
}

      
```

### C#

```c#
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

using CommandLine;
using Google.Ads.Gax.Examples;
using Google.Ads.GoogleAds.Config;
using Google.Ads.GoogleAds.Extensions.Config;
using Google.Ads.GoogleAds.Lib;
using Google.Ads.GoogleAds.V24.Common;
using Google.Ads.GoogleAds.V24.Errors;
using Google.Ads.GoogleAds.V24.Resources;
using Google.Ads.GoogleAds.V24.Services;
using System;
using System.Collections.Generic;
using System.Configuration;
using static Google.Ads.GoogleAds.V24.Enums.AdvertisingChannelTypeEnum.Types;
using static Google.Ads.GoogleAds.V24.Enums.BudgetDeliveryMethodEnum.Types;
using static Google.Ads.GoogleAds.V24.Enums.CampaignStatusEnum.Types;
using static Google.Ads.GoogleAds.V24.Enums.EuPoliticalAdvertisingStatusEnum.Types;
using static Google.Ads.GoogleAds.V24.Resources.Campaign.Types;

namespace Google.Ads.GoogleAds.Examples.V24
{
    /// <summary>
    /// This code example adds campaigns.
    /// </summary>
    public class AddCampaigns : ExampleBase
    {
        /// <summary>
        /// Command line options for running the <see cref="AddCampaigns"/> example.
        /// </summary>
        public class Options : OptionsBase
        {
            /// <summary>
            /// The Google Ads customer ID for which the call is made.
            /// </summary>
            [Option("customerId", Required = true, HelpText =
                "The Google Ads customer ID for which the call is made.")]
            public long CustomerId { get; set; }
        }

        /// <summary>
        /// Main method, to run this code example as a standalone application.
        /// </summary>
        /// <param name="args">The command line arguments.</param>
        public static void Main(string[] args)
        {
            Options options = ExampleUtilities.ParseCommandLine<Options>(args);

            AddCampaigns codeExample = new AddCampaigns();
            Console.WriteLine(codeExample.Description);            
            codeExample.Run(new GoogleAdsClient(),
                options.CustomerId);
        }

        /// <summary>
        /// Number of campaigns to create.
        /// </summary>
        private const int NUM_CAMPAIGNS_TO_CREATE = 5;

        /// <summary>
        /// Returns a description about the code example.
        /// </summary>
        public override string Description => "This code example adds campaigns. To get " +
            "campaigns, run GetCampaign.cs.";

        /// <summary>
        /// Runs the code example.
        /// </summary>
        /// <param name="client">The Google Ads client.</param>
        /// <param name="customerId">The Google Ads customer ID for which the call is made.</param>
        public void Run(GoogleAdsClient client, long customerId)
        {
            // Get the CampaignService.
            CampaignServiceClient campaignService = client.GetService(Services.V24.CampaignService);

            // Create a budget to be used for the campaign.
            string budget = CreateBudget(client, customerId);

            List<CampaignOperation> operations = new List<CampaignOperation>();

            for (int i = 0; i < NUM_CAMPAIGNS_TO_CREATE; i++)
            {
                // Create the campaign.
                Campaign campaign = new Campaign()
                {
                    Name = "Interplanetary Cruise #" + ExampleUtilities.GetRandomString(),
                    AdvertisingChannelType = AdvertisingChannelType.Search,

                    // Recommendation: Set the campaign to PAUSED when creating it to prevent
                    // the ads from immediately serving. Set to ENABLED once you've added
                    // targeting and the ads are ready to serve
                    Status = CampaignStatus.Paused,

                    // Set the bidding strategy and budget.
                    ManualCpc = new ManualCpc(),
                    CampaignBudget = budget,

                    // Set the campaign network options.
                    NetworkSettings = new NetworkSettings
                    {
                        TargetGoogleSearch = true,
                        TargetSearchNetwork = true,
                        // Enable Display Expansion on Search campaigns. See
                        // https://support.google.com/google-ads/answer/7193800 to learn more.
                        TargetContentNetwork = true,
                        TargetPartnerSearchNetwork = false
                    },

                    // Declare whether or not this campaign contains political ads targeting the EU.
                    ContainsEuPoliticalAdvertising = EuPoliticalAdvertisingStatus.DoesNotContainEuPoliticalAdvertising,

                    // Optional: Set the start date.
                    StartDateTime = DateTime.Now.AddDays(1).ToString("yyyyMMdd 00:00:00"),

                    // Optional: Set the end date.
                    EndDateTime = DateTime.Now.AddYears(1).ToString("yyyyMMdd 23:59:59"),
                };

                // Create the operation.
                operations.Add(new CampaignOperation() { Create = campaign });
            }
            try
            {
                // Add the campaigns.
                MutateCampaignsResponse retVal = campaignService.MutateCampaigns(
                    customerId.ToString(), operations);

                // Display the results.
                if (retVal.Results.Count > 0)
                {
                    foreach (MutateCampaignResult newCampaign in retVal.Results)
                    {
                        Console.WriteLine("Campaign with resource ID = '{0}' was added.",
                            newCampaign.ResourceName);
                    }
                }
                else
                {
                    Console.WriteLine("No campaigns were added.");
                }
            }
            catch (GoogleAdsException e)
            {
                Console.WriteLine("Failure:");
                Console.WriteLine($"Message: {e.Message}");
                Console.WriteLine($"Failure: {e.Failure}");
                Console.WriteLine($"Request ID: {e.RequestId}");
                throw;
            }
        }

        /// <summary>
        /// Creates the budget for the campaign.
        /// </summary>
        /// <param name="client">The Google Ads client.</param>
        /// <param name="customerId">The Google Ads customer ID for which the call is made.</param>
        /// <returns>The resource name of the newly created campaign budget.</returns>
        private static string CreateBudget(GoogleAdsClient client, long customerId)
        {
            // Get the BudgetService.
            CampaignBudgetServiceClient budgetService = client.GetService(
                Services.V24.CampaignBudgetService);

            // Create the campaign budget.
            CampaignBudget budget = new CampaignBudget()
            {
                Name = "Interplanetary Cruise Budget #" + ExampleUtilities.GetRandomString(),
                DeliveryMethod = BudgetDeliveryMethod.Standard,
                AmountMicros = 500000
            };

            // Create the operation.
            CampaignBudgetOperation budgetOperation = new CampaignBudgetOperation()
            {
                Create = budget
            };

            // Create the campaign budget.
            MutateCampaignBudgetsResponse response = budgetService.MutateCampaignBudgets(
                customerId.ToString(), new CampaignBudgetOperation[] { budgetOperation });
            return response.Results[0].ResourceName;
        }
    }
}

      
```

### PHP

```php
<?php

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

namespace Google\Ads\GoogleAds\Examples\BasicOperations;

require __DIR__ . '/../../vendor/autoload.php';

use GetOpt\GetOpt;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentNames;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentParser;
use Google\Ads\GoogleAds\Examples\Utils\Helper;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsException;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\V24\Common\ManualCpc;
use Google\Ads\GoogleAds\V24\Enums\AdvertisingChannelTypeEnum\AdvertisingChannelType;
use Google\Ads\GoogleAds\V24\Enums\BudgetDeliveryMethodEnum\BudgetDeliveryMethod;
use Google\Ads\GoogleAds\V24\Enums\CampaignStatusEnum\CampaignStatus;
use Google\Ads\GoogleAds\V24\Enums\EuPoliticalAdvertisingStatusEnum\EuPoliticalAdvertisingStatus;
use Google\Ads\GoogleAds\V24\Errors\GoogleAdsError;
use Google\Ads\GoogleAds\V24\Resources\Campaign;
use Google\Ads\GoogleAds\V24\Resources\Campaign\NetworkSettings;
use Google\Ads\GoogleAds\V24\Resources\CampaignBudget;
use Google\Ads\GoogleAds\V24\Services\CampaignBudgetOperation;
use Google\Ads\GoogleAds\V24\Services\CampaignOperation;
use Google\Ads\GoogleAds\V24\Services\MutateCampaignsRequest;
use Google\Ads\GoogleAds\V24\Services\MutateCampaignBudgetsRequest;
use Google\ApiCore\ApiException;

/** This example adds new campaigns to an account. */
class AddCampaigns
{
    private const CUSTOMER_ID = 'INSERT_CUSTOMER_ID_HERE';
    private const NUMBER_OF_CAMPAIGNS_TO_ADD = 2;

    public static function main()
    {
        // Either pass the required parameters for this example on the command line, or insert them
        // into the constants above.
        $options = (new ArgumentParser())->parseCommandArguments([
            ArgumentNames::CUSTOMER_ID => GetOpt::REQUIRED_ARGUMENT
        ]);

        // Generate a refreshable OAuth2 credential for authentication.
        $oAuth2Credential = (new OAuth2TokenBuilder())->fromFile()->build();

        // Construct a Google Ads client configured from a properties file and the
        // OAuth2 credentials above.
        $googleAdsClient = (new GoogleAdsClientBuilder())
            ->fromFile()
            ->withOAuth2Credential($oAuth2Credential)
            ->build();

        try {
            self::runExample(
                $googleAdsClient,
                $options[ArgumentNames::CUSTOMER_ID] ?: self::CUSTOMER_ID
            );
        } catch (GoogleAdsException $googleAdsException) {
            printf(
                "Request with ID '%s' has failed.%sGoogle Ads failure details:%s",
                $googleAdsException->getRequestId(),
                PHP_EOL,
                PHP_EOL
            );
            foreach ($googleAdsException->getGoogleAdsFailure()->getErrors() as $error) {
                /** @var GoogleAdsError $error */
                printf(
                    "\t%s: %s%s",
                    $error->getErrorCode()->getErrorCode(),
                    $error->getMessage(),
                    PHP_EOL
                );
            }
            exit(1);
        } catch (ApiException $apiException) {
            printf(
                "ApiException was thrown with message '%s'.%s",
                $apiException->getMessage(),
                PHP_EOL
            );
            exit(1);
        }
    }

    /**
     * Runs the example.
     *
     * @param GoogleAdsClient $googleAdsClient the Google Ads API client
     * @param int $customerId the customer ID
     */
    public static function runExample(GoogleAdsClient $googleAdsClient, int $customerId)
    {
        // Creates a single shared budget to be used by the campaigns added below.
        $budgetResourceName = self::addCampaignBudget($googleAdsClient, $customerId);

        // Configures the campaign network options.
        $networkSettings = new NetworkSettings([
            'target_google_search' => true,
            'target_search_network' => true,
            // Enables Display Expansion on Search campaigns. See
            // https://support.google.com/google-ads/answer/7193800 to learn more.
            'target_content_network' => true,
            'target_partner_search_network' => false
        ]);

        $campaignOperations = [];
        for ($i = 0; $i < self::NUMBER_OF_CAMPAIGNS_TO_ADD; $i++) {
            // Creates a campaign.
            $campaign = new Campaign([
                'name' => 'Interplanetary Cruise #' . Helper::getPrintableDatetime(),
                'advertising_channel_type' => AdvertisingChannelType::SEARCH,
                // Recommendation: Set the campaign to PAUSED when creating it to prevent
                // the ads from immediately serving. Set to ENABLED once you've added
                // targeting and the ads are ready to serve.
                'status' => CampaignStatus::PAUSED,
                // Sets the bidding strategy and budget.
                'manual_cpc' => new ManualCpc(),
                'campaign_budget' => $budgetResourceName,
                // Adds the network settings configured above.
                'network_settings' => $networkSettings,
                // Declare whether or not this campaign serves political ads targeting the EU.
                'contains_eu_political_advertising' =>
                    EuPoliticalAdvertisingStatus::DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
                // Optional: Sets the start and end dates.
                'start_date_time' => date('Y-m-d 00:00:00', strtotime('+1 day')),
                'end_date_time' => date('Y-m-d 23:59:59', strtotime('+1 month'))
            ]);

            // Creates a campaign operation.
            $campaignOperation = new CampaignOperation();
            $campaignOperation->setCreate($campaign);
            $campaignOperations[] = $campaignOperation;
        }

        // Issues a mutate request to add campaigns.
        $campaignServiceClient = $googleAdsClient->getCampaignServiceClient();
        $response = $campaignServiceClient->mutateCampaigns(
            MutateCampaignsRequest::build($customerId, $campaignOperations)
        );

        printf("Added %d campaigns:%s", $response->getResults()->count(), PHP_EOL);

        foreach ($response->getResults() as $addedCampaign) {
            /** @var Campaign $addedCampaign */
            print "{$addedCampaign->getResourceName()}" . PHP_EOL;
        }
    }

    /**
     * Creates a new campaign budget in the specified client account.
     *
     * @param GoogleAdsClient $googleAdsClient the Google Ads API client
     * @param int $customerId the customer ID
     * @return string the resource name of the newly created budget
     */
    private static function addCampaignBudget(GoogleAdsClient $googleAdsClient, int $customerId)
    {
        // Creates a campaign budget.
        $budget = new CampaignBudget([
            'name' => 'Interplanetary Cruise Budget #' . Helper::getPrintableDatetime(),
            'delivery_method' => BudgetDeliveryMethod::STANDARD,
            'amount_micros' => 500000
        ]);

        // Creates a campaign budget operation.
        $campaignBudgetOperation = new CampaignBudgetOperation();
        $campaignBudgetOperation->setCreate($budget);

        // Issues a mutate request.
        $campaignBudgetServiceClient = $googleAdsClient->getCampaignBudgetServiceClient();
        $response = $campaignBudgetServiceClient->mutateCampaignBudgets(
            MutateCampaignBudgetsRequest::build($customerId, [$campaignBudgetOperation])
        );

        /** @var CampaignBudget $addedBudget */
        $addedBudget = $response->getResults()[0];
        printf("Added budget named '%s'%s", $addedBudget->getResourceName(), PHP_EOL);

        return $addedBudget->getResourceName();
    }
}

AddCampaigns::main();

      
```

### Python

```python
#!/usr/bin/env python
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""This example illustrates how to add a campaign.

To get campaigns, run get_campaigns.py.
"""

import argparse
import datetime
import sys
from typing import List
import uuid

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.ads.googleads.v24.services.services.campaign_budget_service import (
    CampaignBudgetServiceClient,
)
from google.ads.googleads.v24.services.types.campaign_budget_service import (
    CampaignBudgetOperation,
    MutateCampaignBudgetsResponse,
)
from google.ads.googleads.v24.services.services.campaign_service import (
    CampaignServiceClient,
)
from google.ads.googleads.v24.services.types.campaign_service import (
    CampaignOperation,
    MutateCampaignsResponse,
)
from google.ads.googleads.v24.resources.types.campaign_budget import (
    CampaignBudget,
)
from google.ads.googleads.v24.resources.types.campaign import Campaign

_START_DATE_FORMAT: str = "%Y%m%d 00:00:00"
_END_DATE_FORMAT: str = "%Y%m%d 23:59:59"


def main(client: GoogleAdsClient, customer_id: str) -> None:
    campaign_budget_service: CampaignBudgetServiceClient = client.get_service(
        "CampaignBudgetService"
    )
    campaign_service: CampaignServiceClient = client.get_service(
        "CampaignService"
    )

    # Create a budget, which can be shared by multiple campaigns.
    campaign_budget_operation: CampaignBudgetOperation = client.get_type(
        "CampaignBudgetOperation"
    )
    campaign_budget: CampaignBudget = campaign_budget_operation.create
    campaign_budget.name = f"Interplanetary Budget {uuid.uuid4()}"
    campaign_budget.delivery_method = (
        client.enums.BudgetDeliveryMethodEnum.STANDARD
    )
    campaign_budget.amount_micros = 500000

    # Add budget.
    campaign_budget_response: MutateCampaignBudgetsResponse
    try:
        budget_operations: List[CampaignBudgetOperation] = [
            campaign_budget_operation
        ]
        campaign_budget_response = (
            campaign_budget_service.mutate_campaign_budgets(
                customer_id=customer_id,
                operations=budget_operations,
            )
        )
    except GoogleAdsException as ex:
        handle_googleads_exception(ex)
        # We are exiting in handle_googleads_exception so this return is not
        # strictly necessary, but it makes static analysis happier.
        return

    # Create campaign.
    campaign_operation: CampaignOperation = client.get_type("CampaignOperation")
    campaign: Campaign = campaign_operation.create
    campaign.name = f"Interplanetary Cruise {uuid.uuid4()}"
    campaign.advertising_channel_type = (
        client.enums.AdvertisingChannelTypeEnum.SEARCH
    )

    # Recommendation: Set the campaign to PAUSED when creating it to prevent
    # the ads from immediately serving. Set to ENABLED once you've added
    # targeting and the ads are ready to serve.
    campaign.status = client.enums.CampaignStatusEnum.PAUSED

    # Set the bidding strategy and budget.
    campaign.manual_cpc = client.get_type("ManualCpc")
    campaign.campaign_budget = campaign_budget_response.results[0].resource_name

    # Set the campaign network options.
    campaign.network_settings.target_google_search = True
    campaign.network_settings.target_search_network = True
    campaign.network_settings.target_partner_search_network = False
    # Enable Display Expansion on Search campaigns. For more details see:
    # https://support.google.com/google-ads/answer/7193800
    campaign.network_settings.target_content_network = True

    # Declare whether or not this campaign serves political ads targeting the
    # EU. Valid values are:
    #   CONTAINS_EU_POLITICAL_ADVERTISING
    #   DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
    campaign.contains_eu_political_advertising = (
        client.enums.EuPoliticalAdvertisingStatusEnum.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
    )

    # Optional: Set the start date.
    start_time: datetime.date = datetime.date.today() + datetime.timedelta(
        days=1
    )
    campaign.start_date_time = datetime.date.strftime(
        start_time, _START_DATE_FORMAT
    )

    # Optional: Set the end date.
    end_time: datetime.date = start_time + datetime.timedelta(weeks=4)
    campaign.end_date_time = datetime.date.strftime(end_time, _END_DATE_FORMAT)

    # Add the campaign.
    campaign_response: MutateCampaignsResponse
    try:
        campaign_operations: List[CampaignOperation] = [campaign_operation]
        campaign_response = campaign_service.mutate_campaigns(
            customer_id=customer_id, operations=campaign_operations
        )
        print(f"Created campaign {campaign_response.results[0].resource_name}.")
    except GoogleAdsException as ex:
        handle_googleads_exception(ex)


def handle_googleads_exception(exception: GoogleAdsException) -> None:
    print(
        f'Request with ID "{exception.request_id}" failed with status '
        f'"{exception.error.code().name}" and includes the following errors:'
    )
    for error in exception.failure.errors:
        print(f'\tError with message "{error.message}".')
        if error.location:
            for field_path_element in error.location.field_path_elements:
                print(f"\t\tOn field: {field_path_element.field_name}")
    sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Adds a campaign for specified customer."
    )
    # The following argument(s) should be provided to run the example.
    parser.add_argument(
        "-c",
        "--customer_id",
        type=str,
        required=True,
        help="The Google Ads customer ID.",
    )
    args: argparse.Namespace = parser.parse_args()

    # GoogleAdsClient will read the google-ads.yaml configuration file in the
    # home directory if none is specified.
    googleads_client: GoogleAdsClient = GoogleAdsClient.load_from_storage(
        version="v24"
    )

    main(googleads_client, args.customer_id)

      
```

### Ruby

```ruby
#!/usr/bin/env ruby
# Encoding: utf-8
#
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example adds a campaign. To get campaigns, run get_campaigns.rb.

require 'optparse'
require 'google/ads/google_ads'
require 'date'

def add_campaigns(customer_id)
  # GoogleAdsClient will read a config file from
  # ENV['HOME']/google_ads_config.rb when called without parameters
  client = Google::Ads::GoogleAds::GoogleAdsClient.new

  # Create a budget, which can be shared by multiple campaigns.
  campaign_budget = client.resource.campaign_budget do |cb|
    cb.name = "Interplanetary Budget #{(Time.new.to_f * 1000).to_i}"
    cb.delivery_method = :STANDARD
    cb.amount_micros = 500000
  end

  operation = client.operation.create_resource.campaign_budget(campaign_budget)

  # Add budget.
  return_budget = client.service.campaign_budget.mutate_campaign_budgets(
    customer_id: customer_id,
    operations: [operation],
  )

  # Create campaign.
  campaign = client.resource.campaign do |c|
    c.name = "Interplanetary Cruise #{(Time.new.to_f * 1000).to_i}"
    c.advertising_channel_type = :SEARCH

    # Recommendation: Set the campaign to PAUSED when creating it to prevent
    # the ads from immediately serving. Set to ENABLED once you've added
    # targeting and the ads are ready to serve.
    c.status = :PAUSED

    # Set the bidding strategy and budget.
    c.manual_cpc = client.resource.manual_cpc
    c.campaign_budget = return_budget.results.first.resource_name

    # Set the campaign network options.
    c.network_settings = client.resource.network_settings do |ns|
      ns.target_google_search = true
      ns.target_search_network = true
      # Enable Display Expansion on Search campaigns. See
      # https://support.google.com/google-ads/answer/7193800 to learn more.
      ns.target_content_network = true
      ns.target_partner_search_network = false
    end

    # Declare whether or not this campaign serves political ads targeting the EU.
    # Valid values are CONTAINS_EU_POLITICAL_ADVERTISING and
    # DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING.
    c.contains_eu_political_advertising = :DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING

    # Optional: Set the start date.
    c.start_date_time = DateTime.parse((Date.today + 1).to_s).strftime('%Y%m%d %H:%M:%S')

    # Optional: Set the end date.
    c.end_date_time = DateTime.parse((Date.today.next_year).to_s).strftime('%Y%m%d %H:%M:%S')
  end

  # Create the operation.
  campaign_operation = client.operation.create_resource.campaign(campaign)

  # Add the campaign.
  response = client.service.campaign.mutate_campaigns(
    customer_id: customer_id,
    operations: [campaign_operation],
  )

  puts "Created campaign #{response.results.first.resource_name}."
end

if __FILE__ == $0
  options = {}
  # The following parameter(s) should be provided to run the example. You can
  # either specify these by changing the INSERT_XXX_ID_HERE values below, or on
  # the command line.
  #
  # Parameters passed on the command line will override any parameters set in
  # code.
  #
  # Running the example with -h will print the command line usage.
  options[:customer_id] = 'INSERT_CUSTOMER_ID_HERE'

  OptionParser.new do |opts|
    opts.banner = sprintf('Usage: add_campaigns.rb [options]')

    opts.separator ''
    opts.separator 'Options:'

    opts.on('-C', '--customer-id CUSTOMER-ID', String, 'Customer ID') do |v|
      options[:customer_id] = v
    end

    opts.separator ''
    opts.separator 'Help:'

    opts.on_tail('-h', '--help', 'Show this message') do
      puts opts
      exit
    end
  end.parse!

  begin
    add_campaigns(options.fetch(:customer_id).tr("-", ""))
  rescue Google::Ads::GoogleAds::Errors::GoogleAdsError => e
    e.failure.errors.each do |error|
      STDERR.printf("Error with message: %s\n", error.message)
      if error.location
        error.location.field_path_elements.each do |field_path_element|
          STDERR.printf("\tOn field: %s\n", field_path_element.field_name)
        end
      end
      error.error_code.to_h.each do |k, v|
        next if v == :UNSPECIFIED
        STDERR.printf("\tType: %s\n\tCode: %s\n", k, v)
      end
    end
    raise
  end
end

      
```

### Perl

```perl
#!/usr/bin/perl -w
#
# Copyright 2019, Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example adds a campaign. To get campaigns, run get_campaigns.pl.

use strict;
use warnings;
use utf8;

use FindBin qw($Bin);
use lib "$Bin/../../lib";
use Google::Ads::GoogleAds::Client;
use Google::Ads::GoogleAds::Utils::GoogleAdsHelper;
use Google::Ads::GoogleAds::V24::Resources::CampaignBudget;
use Google::Ads::GoogleAds::V24::Resources::Campaign;
use Google::Ads::GoogleAds::V24::Resources::NetworkSettings;
use Google::Ads::GoogleAds::V24::Common::ManualCpc;
use Google::Ads::GoogleAds::V24::Enums::BudgetDeliveryMethodEnum   qw(STANDARD);
use Google::Ads::GoogleAds::V24::Enums::AdvertisingChannelTypeEnum qw(SEARCH);
use Google::Ads::GoogleAds::V24::Enums::CampaignStatusEnum         qw(PAUSED);
use Google::Ads::GoogleAds::V24::Enums::EuPoliticalAdvertisingStatusEnum
  qw(DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING);
use
  Google::Ads::GoogleAds::V24::Services::CampaignBudgetService::CampaignBudgetOperation;
use Google::Ads::GoogleAds::V24::Services::CampaignService::CampaignOperation;

use Getopt::Long qw(:config auto_help);
use Pod::Usage;
use Cwd          qw(abs_path);
use Data::Uniqid qw(uniqid);
use POSIX        qw(strftime);

# The following parameter(s) should be provided to run the example. You can
# either specify these by changing the INSERT_XXX_ID_HERE values below, or on
# the command line.
#
# Parameters passed on the command line will override any parameters set in
# code.
#
# Running the example with -h will print the command line usage.
my $customer_id = "INSERT_CUSTOMER_ID_HERE";

sub add_campaigns {
  my ($api_client, $customer_id) = @_;

  # Create a campaign budget, which can be shared by multiple campaigns.
  my $campaign_budget =
    Google::Ads::GoogleAds::V24::Resources::CampaignBudget->new({
      name           => "Interplanetary budget #" . uniqid(),
      deliveryMethod => STANDARD,
      amountMicros   => 500000
    });

  # Create a campaign budget operation.
  my $campaign_budget_operation =
    Google::Ads::GoogleAds::V24::Services::CampaignBudgetService::CampaignBudgetOperation
    ->new({create => $campaign_budget});

  # Add the campaign budget.
  my $campaign_budgets_response = $api_client->CampaignBudgetService()->mutate({
      customerId => $customer_id,
      operations => [$campaign_budget_operation]});

  # Create a campaign.
  my $campaign = Google::Ads::GoogleAds::V24::Resources::Campaign->new({
      name                   => "Interplanetary Cruise #" . uniqid(),
      advertisingChannelType => SEARCH,
      # Recommendation: Set the campaign to PAUSED when creating it to stop
      # the ads from immediately serving. Set to ENABLED once you've added
      # targeting and the ads are ready to serve.
      status => PAUSED,
      # Set the bidding strategy and budget.
      manualCpc      => Google::Ads::GoogleAds::V24::Common::ManualCpc->new(),
      campaignBudget => $campaign_budgets_response->{results}[0]{resourceName},
      # Set the campaign network options.
      networkSettings =>
        Google::Ads::GoogleAds::V24::Resources::NetworkSettings->new({
          targetGoogleSearch  => "true",
          targetSearchNetwork => "true",
          # Enable Display Expansion on Search campaigns. See
          # https://support.google.com/google-ads/answer/7193800 to learn more.
          targetContentNetwork       => "true",
          targetPartnerSearchNetwork => "false"
        }
        ),
      # Declare whether or not this campaign serves political ads targeting the EU.
      # Valid values are CONTAINS_EU_POLITICAL_ADVERTISING and
      # DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING.
      containsEuPoliticalAdvertising =>
        DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
      # Optional: Set the start datetime. The campaign starts tomorrow.
      startDateTime =>
        strftime("%Y%m%d 00:00:00", localtime(time + 60 * 60 * 24)),
      # Optional: Set the end datetime. The campaign runs for 30 days.
      endDateTime =>
        strftime("%Y%m%d 23:59:59", localtime(time + 60 * 60 * 24 * 30)),
    });

  # Create a campaign operation.
  my $campaign_operation =
    Google::Ads::GoogleAds::V24::Services::CampaignService::CampaignOperation->
    new({create => $campaign});

  # Add the campaign.
  my $campaigns_response = $api_client->CampaignService()->mutate({
      customerId => $customer_id,
      operations => [$campaign_operation]});

  printf "Created campaign '%s'.\n",
    $campaigns_response->{results}[0]{resourceName};

  return 1;
}

# Don't run the example if the file is being included.
if (abs_path($0) ne abs_path(__FILE__)) {
  return 1;
}

# Get Google Ads Client, credentials will be read from ~/googleads.properties.
my $api_client = Google::Ads::GoogleAds::Client->new();

# By default examples are set to die on any server returned fault.
$api_client->set_die_on_faults(1);

# Parameters passed on the command line will override any parameters set in code.
GetOptions("customer_id=s" => \$customer_id);

# Print the help message if the parameters are not initialized in the code nor
# in the command line.
pod2usage(2) if not check_params($customer_id);

# Call the example.
add_campaigns($api_client, $customer_id =~ s/-//gr);

=pod

=head1 NAME

add_campaigns

=head1 DESCRIPTION

This example adds a campaign. To get campaigns, run get_campaigns.pl.

=head1 SYNOPSIS

add_campaigns.pl [options]

    -help                       Show the help message.
    -customer_id                The Google Ads customer ID.

=cut

      
```

### curl

```console
#!/bin/bash
# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Creates a campaign budget.
#
# Variables:
#   API_VERSION,
#   CUSTOMER_ID,
#   DEVELOPER_TOKEN,
#   MANAGER_CUSTOMER_ID,
#   OAUTH2_ACCESS_TOKEN:
#     See https://developers.google.com/google-ads/api/rest/auth#request_headers
#     for details.
curl -f --request POST \
  "https://googleads.googleapis.com/v${API_VERSION}/customers/${CUSTOMER_ID}/campaignBudgets:mutate" \
  --header "Content-Type: application/json" \
  --header "Developer-Token: ${DEVELOPER_TOKEN}" \
  --header "login-customer-id: ${MANAGER_CUSTOMER_ID}" \
  --header "Authorization: Bearer ${OAUTH2_ACCESS_TOKEN}" \
  --data @- <<EOF
{
  "operations": [
    {
      "create": {
        "name":"Interplanetary Cruise Budget #${RANDOM}",
        "deliveryMethod":"STANDARD",
        "amountMicros":500000
      }
    }
  ]
}
EOF

# Creates a campaign.
#
# Variables:
#   API_VERSION,
#   CUSTOMER_ID,
#   DEVELOPER_TOKEN,
#   MANAGER_CUSTOMER_ID,
#   OAUTH2_ACCESS_TOKEN:
#     See https://developers.google.com/google-ads/api/rest/auth#request_headers
#     for details.
#   CAMPAIGN_BUDGET_RESOURCE_NAME:
#     The resource of the campaign budget as returned by the previous step.

curl -f --request POST \
  "https://googleads.googleapis.com/v${API_VERSION}/customers/${CUSTOMER_ID}/campaigns:mutate" \
  --header "Content-Type: application/json" \
  --header "Developer-Token: ${DEVELOPER_TOKEN}" \
  --header "login-customer-id: ${MANAGER_CUSTOMER_ID}" \
  --header "Authorization: Bearer ${OAUTH2_ACCESS_TOKEN}" \
  --data @- <<EOF
{
  "operations": [
    {
      "create": {
        "campaignBudget": "${CAMPAIGN_BUDGET_RESOURCE_NAME}",
        "name": "Interplanetary Cruise Campaign #${RANDOM}",
        "advertisingChannelType": "SEARCH",
        "status": "PAUSED",
        "manualCpc": {},
        "networkSettings": {
          "targetGoogleSearch":true,
          "targetSearchNetwork":true,
          "targetContentNetwork":true,
          "targetPartnerSearchNetwork":false
        }
      }
    }
  ]
}
EOF

      
```

<br />

## Campaign groups

You can use the [`CampaignGroupService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGroupService) to
create [campaign groups](https://support.google.com/google-ads/answer/6393407) for
tracking the overall performance of multiple campaigns with similar goals.

The first step is to create a campaign group. Next, add the campaigns you want
to track to this campaign group. You can pick any combinations of Search,
Shopping, Display, or Video campaigns, subject to the following restrictions:

- Each campaign can only belong to one campaign group at a time.
- You can't add campaigns with shared budgets to a campaign group.

> [!NOTE]
> **Note:** [Performance targets](https://support.google.com/google-ads/answer/6393275) are not supported in the Google Ads API.



## Add ad groups

The best way to set up new ad groups in the API is to use the **Add Ad Groups**
[code example](https://developers.google.com/google-ads/api/docs/client-libs) in the **Basic Operations** folder of your client
library. The sample handles all the background authentication tasks for you, and
walks you through the settings required for creating an ad group.


### Java

```java
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.ads.googleads.examples.basicoperations;

import static com.google.ads.googleads.examples.utils.CodeSampleHelper.getPrintableDateTime;

import com.beust.jcommander.Parameter;
import com.google.ads.googleads.examples.utils.ArgumentNames;
import com.google.ads.googleads.examples.utils.CodeSampleParams;
import com.google.ads.googleads.lib.GoogleAdsClient;
import com.google.ads.googleads.v25.enums.AdGroupStatusEnum.AdGroupStatus;
import com.google.ads.googleads.v25.enums.AdGroupTypeEnum.AdGroupType;
import com.google.ads.googleads.v25.errors.GoogleAdsError;
import com.google.ads.googleads.v25.errors.GoogleAdsException;
import com.google.ads.googleads.v25.resources.AdGroup;
import com.google.ads.googleads.v25.services.AdGroupOperation;
import com.google.ads.googleads.v25.services.AdGroupServiceClient;
import com.google.ads.googleads.v25.services.MutateAdGroupResult;
import com.google.ads.googleads.v25.services.MutateAdGroupsResponse;
import com.google.ads.googleads.v25.utils.ResourceNames;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Adds ad groups to a campaign. */
public class AddAdGroups {

  private static class AddAdGroupParams extends CodeSampleParams {

    @Parameter(names = ArgumentNames.CUSTOMER_ID, required = true)
    private Long customerId;

    @Parameter(names = ArgumentNames.CAMPAIGN_ID, required = true)
    private Long campaignId;
  }

  public static void main(String[] args) throws IOException {
    AddAdGroupParams params = new AddAdGroupParams();
    if (!params.parseArguments(args)) {

      // Either pass the required parameters for this example on the command line, or insert them
      // into the code here. See the parameter class definition above for descriptions.
      params.customerId = Long.parseLong("INSERT_CUSTOMER_ID_HERE");
      params.campaignId = Long.parseLong("INSERT_CAMPAIGN_ID_HERE");
    }

    GoogleAdsClient googleAdsClient = null;
    try {
      googleAdsClient = GoogleAdsClient.newBuilder().fromPropertiesFile().build();
    } catch (FileNotFoundException fnfe) {
      System.err.printf(
          "Failed to load GoogleAdsClient configuration from file. Exception: %s%n", fnfe);
      System.exit(1);
    } catch (IOException ioe) {
      System.err.printf("Failed to create GoogleAdsClient. Exception: %s%n", ioe);
      System.exit(1);
    }

    try {
      new AddAdGroups().runExample(googleAdsClient, params.customerId, params.campaignId);
    } catch (GoogleAdsException gae) {
      // GoogleAdsException is the base class for most exceptions thrown by an API request.
      // Instances of this exception have a message and a GoogleAdsFailure that contains a
      // collection of GoogleAdsErrors that indicate the underlying causes of the
      // GoogleAdsException.
      System.err.printf(
          "Request ID %s failed due to GoogleAdsException. Underlying errors:%n",
          gae.getRequestId());
      int i = 0;
      for (GoogleAdsError googleAdsError : gae.getGoogleAdsFailure().getErrorsList()) {
        System.err.printf("  Error %d: %s%n", i++, googleAdsError);
      }
      System.exit(1);
    }
  }

  /**
   * Runs the example.
   *
   * @param googleAdsClient the Google Ads API client.
   * @param customerId the client customer ID.
   * @param campaignId the campaign ID.
   * @throws GoogleAdsException if an API request failed with one or more service errors.
   */
  private void runExample(GoogleAdsClient googleAdsClient, long customerId, long campaignId) {
    String campaignResourceName = ResourceNames.campaign(customerId, campaignId);

    // Creates an ad group, setting an optional CPC value.
    AdGroup adGroup1 =
        AdGroup.newBuilder()
            .setName("Earth to Mars Cruises #" + getPrintableDateTime())
            .setStatus(AdGroupStatus.ENABLED)
            .setCampaign(campaignResourceName)
            .setType(AdGroupType.SEARCH_STANDARD)
            .setCpcBidMicros(10_000_000L)
            .build();

    // You may add as many additional ad groups as you need.
    AdGroup adGroup2 =
        AdGroup.newBuilder()
            .setName("Earth to Venus Cruises #" + getPrintableDateTime())
            .setStatus(AdGroupStatus.ENABLED)
            .setCampaign(campaignResourceName)
            .setType(AdGroupType.SEARCH_STANDARD)
            .setCpcBidMicros(10_000_000L)
            .build();

    List<AdGroupOperation> operations = new ArrayList<>();
    operations.add(AdGroupOperation.newBuilder().setCreate(adGroup1).build());
    operations.add(AdGroupOperation.newBuilder().setCreate(adGroup2).build());

    try (AdGroupServiceClient adGroupServiceClient =
        googleAdsClient.getLatestVersion().createAdGroupServiceClient()) {
      MutateAdGroupsResponse response =
          adGroupServiceClient.mutateAdGroups(Long.toString(customerId), operations);
      System.out.printf("Added %d ad groups:%n", response.getResultsCount());
      for (MutateAdGroupResult result : response.getResultsList()) {
        System.out.println(result.getResourceName());
      }
    }
  }
}

      
```

### C#

```c#
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

using CommandLine;
using Google.Ads.Gax.Examples;
using Google.Ads.GoogleAds.Lib;
using Google.Ads.GoogleAds.V25.Enums;
using Google.Ads.GoogleAds.V25.Errors;
using Google.Ads.GoogleAds.V25.Resources;
using Google.Ads.GoogleAds.V25.Services;
using System;
using System.Collections.Generic;

namespace Google.Ads.GoogleAds.Examples.V25
{
    /// <summary>
    /// This code example illustrates how to create ad groups. To create campaigns, run
    /// AddCampaigns.cs.
    /// </summary>
    public class AddAdGroups : ExampleBase
    {
        /// <summary>
        /// Command line options for running the <see cref="AddAdGroups"/> example.
        /// </summary>
        public class Options : OptionsBase
        {
            /// <summary>
            /// The Google Ads customer ID for which the call is made.
            /// </summary>
            [Option("customerId", Required = true, HelpText =
                "The Google Ads customer ID for which the call is made.")]
            public long CustomerId { get; set; }

            /// <summary>
            /// ID of the campaign to which ad groups are added.
            /// </summary>
            [Option("campaignId", Required = true, HelpText =
                "ID of the campaign to which ad groups are added.")]
            public long CampaignId { get; set; }
        }

        /// <summary>
        /// Main method, to run this code example as a standalone application.
        /// </summary>
        /// <param name="args">The command line arguments.</param>
        public static void Main(string[] args)
        {
            Options options = ExampleUtilities.ParseCommandLine<Options>(args);

            AddAdGroups codeExample = new AddAdGroups();
            Console.WriteLine(codeExample.Description);
            codeExample.Run(new GoogleAdsClient(),
                options.CustomerId,
                options.CampaignId);
        }

        /// <summary>
        /// Number of ad groups to create.
        /// </summary>
        private const int NUM_ADGROUPS_TO_CREATE = 5;

        /// <summary>
        /// Returns a description about the code example.
        /// </summary>
        public override string Description =>
            "This code example illustrates how to create ad groups. To create campaigns, run " +
            "AddCampaigns.cs";

        /// <summary>
        /// Runs the code example.
        /// </summary>
        /// <param name="client">The Google Ads client.</param>
        /// <param name="customerId">The Google Ads customer ID for which the call is made.</param>
        /// <param name="campaignId">ID of the campaign to which ad groups are added.</param>
        public void Run(GoogleAdsClient client, long customerId, long campaignId)
        {
            // Get the AdGroupService.
            AdGroupServiceClient adGroupService = client.GetService(Services.V25.AdGroupService);

            List<AdGroupOperation> operations = new List<AdGroupOperation>();

            for (int i = 0; i < NUM_ADGROUPS_TO_CREATE; i++)
            {
                // Create the ad group.
                AdGroup adGroup = new AdGroup()
                {
                    Name = $"Earth to Mars Cruises #{ExampleUtilities.GetRandomString()}",
                    Status = AdGroupStatusEnum.Types.AdGroupStatus.Enabled,
                    Campaign = ResourceNames.Campaign(customerId, campaignId),

                    // Set the ad group bids.
                    CpcBidMicros = 10000000
                };

                // Create the operation.
                AdGroupOperation operation = new AdGroupOperation()
                {
                    Create = adGroup
                };
                operations.Add(operation);
            }

            try
            {
                // Create the ad groups.
                MutateAdGroupsResponse response = adGroupService.MutateAdGroups(
                    customerId.ToString(), operations);

                // Display the results.
                foreach (MutateAdGroupResult newAdGroup in response.Results)
                {
                    Console.WriteLine("Ad group with resource name '{0}' was created.",
                        newAdGroup.ResourceName);
                }
            }
            catch (GoogleAdsException e)
            {
                Console.WriteLine("Failure:");
                Console.WriteLine($"Message: {e.Message}");
                Console.WriteLine($"Failure: {e.Failure}");
                Console.WriteLine($"Request ID: {e.RequestId}");
                throw;
            }
        }
    }
}

      
```

### PHP

```php
<?php

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

namespace Google\Ads\GoogleAds\Examples\BasicOperations;

require __DIR__ . '/../../vendor/autoload.php';

use GetOpt\GetOpt;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentNames;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentParser;
use Google\Ads\GoogleAds\Examples\Utils\Helper;
use Google\Ads\GoogleAds\Lib\V25\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V25\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\Lib\V25\GoogleAdsException;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Util\V25\ResourceNames;
use Google\Ads\GoogleAds\V25\Enums\AdGroupStatusEnum\AdGroupStatus;
use Google\Ads\GoogleAds\V25\Enums\AdGroupTypeEnum\AdGroupType;
use Google\Ads\GoogleAds\V25\Errors\GoogleAdsError;
use Google\Ads\GoogleAds\V25\Resources\AdGroup;
use Google\Ads\GoogleAds\V25\Services\AdGroupOperation;
use Google\Ads\GoogleAds\V25\Services\MutateAdGroupsRequest;
use Google\ApiCore\ApiException;

/** This example adds ad groups to a campaign. */
class AddAdGroups
{
    private const CUSTOMER_ID = 'INSERT_CUSTOMER_ID_HERE';
    private const CAMPAIGN_ID = 'INSERT_CAMPAIGN_ID_HERE';

    public static function main()
    {
        // Either pass the required parameters for this example on the command line, or insert them
        // into the constants above.
        $options = (new ArgumentParser())->parseCommandArguments([
            ArgumentNames::CUSTOMER_ID => GetOpt::REQUIRED_ARGUMENT,
            ArgumentNames::CAMPAIGN_ID => GetOpt::REQUIRED_ARGUMENT
        ]);

        // Generate a refreshable OAuth2 credential for authentication.
        $oAuth2Credential = (new OAuth2TokenBuilder())->fromFile()->build();

        // Construct a Google Ads client configured from a properties file and the
        // OAuth2 credentials above.
        $googleAdsClient = (new GoogleAdsClientBuilder())->fromFile()
            ->withOAuth2Credential($oAuth2Credential)
            ->build();

        try {
            self::runExample(
                $googleAdsClient,
                $options[ArgumentNames::CUSTOMER_ID] ?: self::CUSTOMER_ID,
                $options[ArgumentNames::CAMPAIGN_ID] ?: self::CAMPAIGN_ID
            );
        } catch (GoogleAdsException $googleAdsException) {
            printf(
                "Request with ID '%s' has failed.%sGoogle Ads failure details:%s",
                $googleAdsException->getRequestId(),
                PHP_EOL,
                PHP_EOL
            );
            foreach ($googleAdsException->getGoogleAdsFailure()->getErrors() as $error) {
                /** @var GoogleAdsError $error */
                printf(
                    "\t%s: %s%s",
                    $error->getErrorCode()->getErrorCode(),
                    $error->getMessage(),
                    PHP_EOL
                );
            }
            exit(1);
        } catch (ApiException $apiException) {
            printf(
                "ApiException was thrown with message '%s'.%s",
                $apiException->getMessage(),
                PHP_EOL
            );
            exit(1);
        }
    }

    /**
     * Runs the example.
     *
     * @param GoogleAdsClient $googleAdsClient the Google Ads API client
     * @param int $customerId the customer ID
     * @param int $campaignId the campaign ID to add ad groups to
     */
    public static function runExample(
        GoogleAdsClient $googleAdsClient,
        int $customerId,
        int $campaignId
    ) {
        $campaignResourceName = ResourceNames::forCampaign($customerId, $campaignId);

        $operations = [];

        // Constructs an ad group and sets an optional CPC value.
        $adGroup1 = new AdGroup([
            'name' => 'Earth to Mars Cruises #' . Helper::getPrintableDatetime(),
            'campaign' => $campaignResourceName,
            'status' => AdGroupStatus::ENABLED,
            'type' => AdGroupType::SEARCH_STANDARD,
            'cpc_bid_micros' => 10000000
        ]);

        $adGroupOperation1 = new AdGroupOperation();
        $adGroupOperation1->setCreate($adGroup1);
        $operations[] = $adGroupOperation1;

        // Constructs another ad group.
        $adGroup2 = new AdGroup([
            'name' => 'Earth to Venus Cruises #' . Helper::getPrintableDatetime(),
            'campaign' => $campaignResourceName,
            'status' => AdGroupStatus::ENABLED,
            'type' => AdGroupType::SEARCH_STANDARD,
            'cpc_bid_micros' => 20000000
        ]);

        $adGroupOperation2 = new AdGroupOperation();
        $adGroupOperation2->setCreate($adGroup2);
        $operations[] = $adGroupOperation2;

        // Issues a mutate request to add the ad groups.
        $adGroupServiceClient = $googleAdsClient->getAdGroupServiceClient();
        $response = $adGroupServiceClient->mutateAdGroups(MutateAdGroupsRequest::build(
            $customerId,
            $operations
        ));

        printf("Added %d ad groups:%s", $response->getResults()->count(), PHP_EOL);

        foreach ($response->getResults() as $addedAdGroup) {
            /** @var AdGroup $addedAdGroup */
            print $addedAdGroup->getResourceName() . PHP_EOL;
        }
    }
}

AddAdGroups::main();

      
```

### Python

```python
#!/usr/bin/env python
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""This example adds an ad group.

To get ad groups, run get_ad_groups.py.
"""

import argparse
import sys
from typing import List
import uuid

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.ads.googleads.v24.services.services.ad_group_service import (
    AdGroupServiceClient,
)
from google.ads.googleads.v24.services.types.ad_group_service import (
    AdGroupOperation,
    MutateAdGroupsResponse,
)
from google.ads.googleads.v24.services.services.campaign_service import (
    CampaignServiceClient,
)
from google.ads.googleads.v24.resources.types.ad_group import AdGroup


def main(client: GoogleAdsClient, customer_id: str, campaign_id: str) -> None:
    ad_group_service: AdGroupServiceClient = client.get_service(
        "AdGroupService"
    )
    campaign_service: CampaignServiceClient = client.get_service(
        "CampaignService"
    )

    # Create ad group.
    ad_group_operation: AdGroupOperation = client.get_type("AdGroupOperation")
    ad_group: AdGroup = ad_group_operation.create
    ad_group.name = f"Earth to Mars cruises {uuid.uuid4()}"
    ad_group.status = client.enums.AdGroupStatusEnum.ENABLED
    ad_group.campaign = campaign_service.campaign_path(customer_id, campaign_id)
    ad_group.type_ = client.enums.AdGroupTypeEnum.SEARCH_STANDARD
    ad_group.cpc_bid_micros = 10000000

    operations: List[AdGroupOperation] = [ad_group_operation]

    # Add the ad group.
    ad_group_response: MutateAdGroupsResponse = (
        ad_group_service.mutate_ad_groups(
            customer_id=customer_id,
            operations=operations,
        )
    )
    print(f"Created ad group {ad_group_response.results[0].resource_name}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Adds an ad group for specified customer and campaign id."
    )
    # The following argument(s) should be provided to run the example.
    parser.add_argument(
        "-c",
        "--customer_id",
        type=str,
        required=True,
        help="The Google Ads customer ID.",
    )
    parser.add_argument(
        "-i", "--campaign_id", type=str, required=True, help="The campaign ID."
    )
    args: argparse.Namespace = parser.parse_args()

    # GoogleAdsClient will read the google-ads.yaml configuration file in the
    # home directory if none is specified.
    googleads_client: GoogleAdsClient = GoogleAdsClient.load_from_storage(
        version="v24"
    )

    try:
        main(googleads_client, args.customer_id, args.campaign_id)
    except GoogleAdsException as ex:
        print(
            f'Request with ID "{ex.request_id}" failed with status '
            f'"{ex.error.code().name}" and includes the following errors:'
        )
        for error in ex.failure.errors:
            print(f'\tError with message "{error.message}".')
            if error.location:
                for field_path_element in error.location.field_path_elements:
                    print(f"\t\tOn field: {field_path_element.field_name}")
        sys.exit(1)

      
```

### Ruby

```ruby
#!/usr/bin/env ruby
# Encoding: utf-8
#
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example adds an ad group. To get ad groups, run get_ad_groups.rb.

require 'optparse'
require 'google/ads/google_ads'
require 'date'
require_relative '../shared/error_handler.rb'

def add_ad_groups(customer_id, campaign_id)
  # GoogleAdsClient will read a config file from
  # ENV['HOME']/google_ads_config.rb when called without parameters
  client = Google::Ads::GoogleAds::GoogleAdsClient.new

  # Create an ad group, setting an optional CPC value.
  ad_group = client.resource.ad_group do |ag|
    ag.name = "Earth to Mars Cruises #{(Time.new.to_f * 1000).to_i}"
    ag.status = :ENABLED
    ag.campaign = client.path.campaign(customer_id, campaign_id)
    ag.type = :SEARCH_STANDARD
    ag.cpc_bid_micros = 10_000_000
  end

  # Create the operation
  ad_group_operation = client.operation.create_resource.ad_group(ad_group)

  # Add the ad group.
  response = client.service.ad_group.mutate_ad_groups(
    customer_id: customer_id,
    operations: [ad_group_operation],
  )

  puts "Created ad group #{response.results.first.resource_name}."
end

if __FILE__ == $0
  options = {}
  # The following parameter(s) should be provided to run the example. You can
  # either specify these by changing the INSERT_XXX_ID_HERE values below, or on
  # the command line.
  #
  # Parameters passed on the command line will override any parameters set in
  # code.
  #
  # Running the example with -h will print the command line usage.
  options[:customer_id] = 'INSERT_CUSTOMER_ID_HERE'
  options[:campaign_id] = 'INSERT_CAMPAIGN_ID_HERE'

  OptionParser.new do |opts|
    opts.banner = sprintf('Usage: %s [options]', File.basename(__FILE__))

    opts.separator ''
    opts.separator 'Options:'

    opts.on('-C', '--customer-id CUSTOMER-ID', String, 'Customer ID') do |v|
      options[:customer_id] = v
    end

    opts.on('-c', '--campaign-id CAMPAIGN-ID', String, 'Campaign ID') do |v|
      options[:campaign_id] = v
    end

    opts.separator ''
    opts.separator 'Help:'

    opts.on_tail('-h', '--help', 'Show this message') do
      puts opts
      exit
    end
  end.parse!

  begin
    add_ad_groups(options.fetch(:customer_id).tr("-", ""), options[:campaign_id])
  rescue Google::Ads::GoogleAds::Errors::GoogleAdsError => e
    GoogleAdsErrorHandler.handle_google_ads_error(e)
    raise # Re-raise the error to maintain original script behavior.
  end
end

      
```

### Perl

```perl
#!/usr/bin/perl -w
#
# Copyright 2019, Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example adds an ad group. To get ad groups, run get_ad_groups.pl.

use strict;
use warnings;
use utf8;

use FindBin qw($Bin);
use lib "$Bin/../../lib";
use Google::Ads::GoogleAds::Client;
use Google::Ads::GoogleAds::Utils::GoogleAdsHelper;
use Google::Ads::GoogleAds::V25::Resources::AdGroup;
use Google::Ads::GoogleAds::V25::Enums::AdGroupStatusEnum qw(ENABLED);
use Google::Ads::GoogleAds::V25::Enums::AdGroupTypeEnum   qw(SEARCH_STANDARD);
use Google::Ads::GoogleAds::V25::Services::AdGroupService::AdGroupOperation;
use Google::Ads::GoogleAds::V25::Utils::ResourceNames;

use Getopt::Long qw(:config auto_help);
use Pod::Usage;
use Cwd          qw(abs_path);
use Data::Uniqid qw(uniqid);

# The following parameter(s) should be provided to run the example. You can
# either specify these by changing the INSERT_XXX_ID_HERE values below, or on
# the command line.
#
# Parameters passed on the command line will override any parameters set in
# code.
#
# Running the example with -h will print the command line usage.
my $customer_id = "INSERT_CUSTOMER_ID_HERE";
my $campaign_id = "INSERT_CAMPAIGN_ID_HERE";

sub add_ad_groups {
  my ($api_client, $customer_id, $campaign_id) = @_;

  # Create an ad group, setting an optional CPC value.
  my $ad_group = Google::Ads::GoogleAds::V25::Resources::AdGroup->new({
      name     => "Earth to Mars Cruises #" . uniqid(),
      status   => ENABLED,
      campaign => Google::Ads::GoogleAds::V25::Utils::ResourceNames::campaign(
        $customer_id, $campaign_id
      ),
      type         => SEARCH_STANDARD,
      cpcBidMicros => 10000000
    });

  # Create an ad group operation.
  my $ad_group_operation =
    Google::Ads::GoogleAds::V25::Services::AdGroupService::AdGroupOperation->
    new({create => $ad_group});

  # Add the ad group.
  my $ad_groups_response = $api_client->AdGroupService()->mutate({
      customerId => $customer_id,
      operations => [$ad_group_operation]});

  printf "Created ad group '%s'.\n",
    $ad_groups_response->{results}[0]{resourceName};

  return 1;
}

# Don't run the example if the file is being included.
if (abs_path($0) ne abs_path(__FILE__)) {
  return 1;
}

# Get Google Ads Client, credentials will be read from ~/googleads.properties.
my $api_client = Google::Ads::GoogleAds::Client->new();

# By default examples are set to die on any server returned fault.
$api_client->set_die_on_faults(1);

# Parameters passed on the command line will override any parameters set in code.
GetOptions("customer_id=s" => \$customer_id, "campaign_id=i" => \$campaign_id);

# Print the help message if the parameters are not initialized in the code nor
# in the command line.
pod2usage(2) if not check_params($customer_id, $campaign_id);

# Call the example.
add_ad_groups($api_client, $customer_id =~ s/-//gr, $campaign_id);

=pod

=head1 NAME

add_ad_groups

=head1 DESCRIPTION

This example adds an ad group. To get ad groups, run get_ad_groups.pl.

=head1 SYNOPSIS

add_ad_groups.pl [options]

    -help                       Show the help message.
    -customer_id                The Google Ads customer ID.
    -campaign_id                The campaign ID.

=cut

      
```

### curl

> [!NOTE]
> **Note:** While a direct REST code sample for this step isn't provided here, you can achieve this using a manual REST request.   
>
> Refer to the Google Ads API REST interface documentation and the method-specific reference pages. You will need to construct the JSON payload based on the proto definitions.   
>
> Key Resources:
>
> - [Using REST](https://developers.google.com/google-ads/api/rest/overview)
> - [REST Interface Structure](https://developers.google.com/google-ads/api/rest/design/overview)
> - [JSON Field Mappings](https://developers.google.com/google-ads/api/rest/design/json-mappings)
> - Consult the [REST API Reference](https://developers.google.com/google-ads/api/reference/rpc/latest/overview) for the specific service and method.

<br />




This page provides an overview of the various ad types and features available
in the API. For an overview of different ad types and formats, see
[About ad formats available in different campaign
types](https://support.google.com/google-ads/answer/1722124).

## Ad channels

Google ads typically appear on [two
networks](https://support.google.com/google-ads/answer/1752334):

Search network
:   Includes Google Search result pages, other Google sites like Maps and
    Shopping, and partnering search sites.

Display network
:   Includes Google sites like YouTube, Blogger, and thousands of partnering
    websites.

If you want to advertise on both networks but don't want to manage separate
Search and Display campaigns, you can create a [Display Expansion on
Search campaign](https://support.google.com/google-ads/answer/7193800) with a
single ad group.

Certain ad types, specifically App engagement and Video ads, don't
appear on either the Search or the Display network and are specific to their
corresponding media: mobile apps or YouTube.

## Mutating ads

You can mutate your ads without losing their performance data by using
[`AdService`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdService).

Not all ad types are mutable as summarized in the following table. If an ad type
is not mutable, it must be removed and recreated to affect changes. Performance
data for the removed ad will continue to be available, but will no longer be
updated.

## Sharing ads in multiple ad groups

Ads of certain types can be referenced from multiple ad groups, referred to as
ad sharing.

In the same way that you can [share keyword
sets](https://developers.google.com/google-ads/api/samples/create-and-attach-shared-keyword-set), an ad can be
shared between ad groups by reusing the same [ad ID](https://developers.google.com/google-ads/api/reference/rpc/v25/Ad#id)
in another [ad group ad](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupAd).

## Ad type compatibility

> [!TIP]
> **Tip:** Interested in using multiple ad types in a single campaign? Performance Max campaigns allow you to access multiple Google Ads channels from a single campaign using assets, so you don't need to make a decision about which ad types to use. See more benefits of [upgrading to Performance Max](https://developers.google.com/google-ads/api/performance-max/upgrade-overview).

This table summarizes the capabilities and limitations for each ad type.
For more details, refer to [enumeration of ad
types](https://developers.google.com/google-ads/api/reference/rpc/v25/AdTypeEnum.AdType) and their associated [set of
resources](https://developers.google.com/google-ads/api/reference/rpc/v25/Ad#ad_data).

| Ad Type | Search | Display | Mutable | Shareable | Description |
|---|---|---|---|---|---|
| [AppAd](https://developers.google.com/google-ads/api/reference/rpc/v25/AppAdInfo) | Yes | Yes | Yes | Yes | App Ads promote an app across all Google properties [from a single campaign](https://developers.google.com/google-ads/api/docs/app-campaigns/overview). More at [advanced campaigns](https://ads.google.com/home/campaigns/app-ads/) and the [Help Center](https://support.google.com/google-ads/answer/6247380). |
| [AppEngagementAd](https://developers.google.com/google-ads/api/reference/rpc/v25/AppEngagementAdInfo) | No | No | No | Yes | App engagement ads allow you to write text encouraging a specific action in the app, like checking in, making a purchase, or booking a flight. [Learn more](https://support.google.com/google-ads/answer/6310747). |
| [CallAd](https://developers.google.com/google-ads/api/reference/rpc/v22/CallAdInfo) | Yes | No | Yes | Yes | **(Removed in v23)** Call ads are designed to encourage people to call your business, and can appear only on devices that make phone calls. When a potential customer clicks your ad, the ad places a call to you from their device. [Learn more](https://support.google.com/google-ads/answer/6341403). Call ads have an additional option of providing a Final URL, which adds a secondary user-facing link to your web page. |
| [DemandGenCarouselAd](https://developers.google.com/google-ads/api/reference/rpc/v25/DemandGenCarouselAdInfo) | No | Yes | No | No | Part of [Demand Gen campaigns](https://developers.google.com/google-ads/api/docs/demand-gen), this ad type consists of several images in a swipeable card format and appears on YouTube, Discover, and Gmail feeds. |
| [DemandGenMultiAssetAd](https://developers.google.com/google-ads/api/reference/rpc/v25/DemandGenMultiAssetAdInfo) | No | Yes | No | No | Part of [Demand Gen campaigns](https://developers.google.com/google-ads/api/docs/demand-gen), this ad type combines headlines, descriptions, images and logos and appears on YouTube, Discover, and Gmail feeds. |
| [DemandGenProductAd](https://developers.google.com/google-ads/api/reference/rpc/v25/DemandGenProductAdInfo) | No | Yes | No | No | Part of [Demand Gen campaigns](https://developers.google.com/google-ads/api/docs/demand-gen), this ad type features product images and appears on YouTube, Discover, and Gmail feeds. See [Shopping Ads](https://developers.google.com/google-ads/api/docs/shopping-ads/overview). |
| [DemandGenVideoResponsiveAd](https://developers.google.com/google-ads/api/reference/rpc/v25/DemandGenVideoResponsiveAdInfo) | No | Yes | No | No | Part of [Demand Gen campaigns](https://developers.google.com/google-ads/api/docs/demand-gen), this ad type is a video ad format that appears on YouTube, Discover, and Gmail feeds. |
| [DisplayUploadAd](https://developers.google.com/google-ads/api/reference/rpc/v25/DisplayUploadAdInfo) | No | Yes | Yes | Yes | A generic type of display ad. Supported [product types](https://developers.google.com/google-ads/api/reference/rpc/v25/DisplayUploadProductTypeEnum.DisplayUploadProductType). |
| [ExpandedDynamicSearchAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ExpandedDynamicSearchAdInfo) | Yes | No | No | Yes | Expanded dynamic search ads contain only two description lines because the headline, final URLs, and display URL are auto-generated at serving time according to domain name specific information. See [Dynamic Search Ads](https://developers.google.com/google-ads/api/docs/dynamic-search-ads/overview) and the [Help Center](https://support.google.com/google-ads/answer/2471185). |
| [ExpandedTextAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ExpandedTextAdInfo) | Yes | Yes | Yes | Yes | **Note:** This ad format is [deprecated](https://support.google.com/google-ads/answer/11031467). We recommend that you transition to [responsive search ads](https://developers.google.com/google-ads/api/docs/responsive-search-ads/overview). |
| [HotelAd](https://developers.google.com/google-ads/api/reference/rpc/v25/HotelAdInfo) | Yes | No | No | Yes | See [Hotel Ads](https://developers.google.com/google-ads/api/docs/hotel-ads/overview) and the [Help Center](https://support.google.com/google-ads/answer/9238461). |
| [ImageAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ImageAdInfo) | Yes^1^ | No | No | Yes | As opposed to a text ad, an image ad is a graphic promoting a business. [Learn more](https://support.google.com/google-ads/answer/2393023). |
| [LegacyAppInstallAd](https://developers.google.com/google-ads/api/reference/rpc/v25/LegacyAppInstallAdInfo) | N/A | N/A | No | No | A legacy app install ad that only can be used by a few select customers. |
| [LocalAd](https://developers.google.com/google-ads/api/reference/rpc/v25/LocalAdInfo) | Yes | Yes | Yes | Yes | Local ads help you promote your business locations across Google. Local ads are available for Performance Max campaigns. [Learn more](https://support.google.com/google-ads/answer/9118422). |
| [LegacyResponsiveDisplayAd](https://developers.google.com/google-ads/api/reference/rpc/v25/LegacyResponsiveDisplayAdInfo) | No | Yes | No | No | Known as "responsive ads" in the UI, this legacy ad type has been replaced by `ResponsiveDisplayAd`. |
| [ResponsiveDisplayAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ResponsiveDisplayAdInfo) | No | Yes | Yes | Yes | See [Responsive Display Ads](https://developers.google.com/google-ads/api/docs/responsive-display-ads/create-responsive-display-ads). |
| [ResponsiveSearchAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ResponsiveSearchAdInfo) | Yes | No | Yes | Yes | Unlike static text ads, responsive search ads permit up to 15 different headlines and 4 different descriptions, which are then tested in combination to find the best permutation. [Learn more](https://support.google.com/google-ads/answer/7684791). |
| [ShoppingComparisonListingAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ShoppingComparisonListingAdInfo) | Yes | No | No | No | See [Shopping Ads](https://developers.google.com/google-ads/api/docs/shopping-ads/overview). [Learn more](https://support.google.com/google-ads/answer/9262823). |
| [ShoppingProductAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ShoppingProductAdInfo) | Yes | Yes ^2^ | No | No | See [Shopping Ads](https://developers.google.com/google-ads/api/docs/shopping-ads/overview). |
| [ShoppingSmartAd](https://developers.google.com/google-ads/api/reference/rpc/v25/ShoppingSmartAdInfo) | Yes | Yes | No | No | See [Shopping Ads](https://developers.google.com/google-ads/api/docs/shopping-ads/overview). |
| [SmartCampaignAd](https://developers.google.com/google-ads/api/reference/rpc/v25/SmartCampaignAdInfo) | Yes | Yes | Yes | No | See [Smart campaigns](https://developers.google.com/google-ads/api/docs/smart-campaigns/overview). |
| [TextAd](https://developers.google.com/google-ads/api/reference/rpc/v25/TextAdInfo) | Yes | Yes | No | Yes | A simple text only ad with a headline and two description lines. This ad format is deprecated. We recommend that you transition to [responsive search ads](https://developers.google.com/google-ads/api/docs/responsive-search-ads/overview). |
| [TravelAd](https://developers.google.com/google-ads/api/reference/rpc/v25/TravelAdInfo) | Yes | No | No | Yes | See [Things to do ads](https://developers.google.com/google-ads/api/docs/things-to-do-ads/overview). |
| [VideoAd](https://developers.google.com/google-ads/api/reference/rpc/v25/VideoAdInfo) | No | No | No | No | The Google Ads API permits only [reporting](https://developers.google.com/google-ads/api/fields/v25/video) of video ads. Video campaigns must be created using the [UI](https://support.google.com/google-ads/answer/2375497) or [Google Ads scripts](https://developers.google.com/google-ads/scripts/docs/campaigns/video-campaigns). For video ads, an impression is generated when the video starts playing, and a video viewpoint for in-stream skippable ads is 30 seconds or video completion (for shorter videos). |
| [VideoResponsiveAd](https://developers.google.com/google-ads/api/reference/rpc/v25/VideoResponsiveAdInfo) | No | No | No | No | Responsive video ads are used in the [video action campaign](https://blog.google/products/ads/new-ways-to-drive-action) type. [Learn more](https://support.google.com/google-ads/answer/7671017). |

^1^ An [`ImageAd`](https://developers.google.com/google-ads/api/reference/rpc/v25/ImageAdInfo) on the Search Network
can appear only on websites of Google Search partners, not on Google Search.

^2^ [YouTube and Google Discover
only](https://ads-developers.googleblog.com/2019/05/expanding-your-shopping-ads-to.html).

## Explore ad fields

To discover all available fields related to ads, including their data types,
descriptions, and which other fields they are compatible with in `SELECT` and
`WHERE` clauses, use the interactive
[Google Ads Query Builder](https://developers.google.com/google-ads/api/fields/v25/overview_query_builder).

To see fields associated with ad types:

1. Go to the [Query Builder](https://developers.google.com/google-ads/api/fields/v25/overview_query_builder).
2. Select the `ad_group_ad` resource.
3. Browse the list of fields. You can find `ad_group_ad.ad.type` and other `ad` attributes.
4. Click any field name to see its description and attributes (filterable, sortable, data type).
5. The tool also shows which segments and metrics can be selected with the `ad_group_ad` resource.




Targeting criteria can be set at three different levels:

- At the [campaign](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion) level.
- At the [ad group](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion) level.
- At the [customer](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion) level.

> [!NOTE]
> **Note:** customer-level criteria can only be negative.

Not all criteria types can be set at all levels: some, for example, can be set
only at the campaign level.

Additionally, some criteria can only be used for negative targeting, and some
can only be used for positive targeting.

The following table describes the allowed usage of all criterion types:
Campaign Ad group Customer

| Type | Positive? | Negative? | Available levels | Notes |
|---|---|---|---|---|
| [Ad schedule](https://developers.google.com/google-ads/api/reference/rpc/v25/AdScheduleInfo) | ✅ | ❌ | - Campaign |   |
| [Age range](https://developers.google.com/google-ads/api/reference/rpc/v25/AgeRangeInfo) | ✅ | ✅ | - Campaign - Ad group |   |
| [App payment model](https://developers.google.com/google-ads/api/reference/rpc/v25/AppPaymentModelInfo) | ✅ | ❌ | - Ad group |   |
| [Audience](https://developers.google.com/google-ads/api/reference/rpc/v25/AudienceInfo) | ✅ | ❌ | - Ad group | Refer to the audience targeting [guide](https://developers.google.com/google-ads/api/docs/demand-gen/audience-targeting) for Demand Gen campaigns. |
| [Brand list](https://developers.google.com/google-ads/api/reference/rpc/v25/BrandListInfo) | ✅ | ✅ | - Campaign - Ad group |   |
| [Carrier](https://developers.google.com/google-ads/api/reference/rpc/v25/CarrierInfo) | ✅ | ❌ | - Campaign |   |
| [Combined audience](https://developers.google.com/google-ads/api/reference/rpc/v25/CombinedAudienceInfo) | ✅ | ❌ | - Campaign - Ad group | See the [Help Center article](https://support.google.com/google-ads/answer/9066029) about combined audiences. |
| [Content label](https://developers.google.com/google-ads/api/reference/rpc/v25/ContentLabelInfo) | ❌ | ✅ | - Campaign - Customer |   |
| [Custom affinity](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomAffinityInfo) | ✅ | ❌ | - Campaign - Ad group | Defined by CustomInterest resources. See the [article](https://support.google.com/google-ads/answer/2497941) about custom audiences. |
| [Custom audience](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomAudienceInfo) | ✅ | ❌ | - Campaign - Ad group | Defined by CustomAudience resources. See the [article](https://support.google.com/google-ads/answer/2497941) about custom audiences. |
| [Custom intent](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomIntentInfo) | ✅ | ❌ | - Ad group | Defined by CustomInterest resources. See the [article](https://support.google.com/google-ads/answer/9069938) about custom intent criteria. |
| [Device](https://developers.google.com/google-ads/api/reference/rpc/v25/DeviceInfo) | ✅ | ❌ | - Campaign |   |
| [Extended demographic](https://developers.google.com/google-ads/api/reference/rpc/v25/ExtendedDemographicInfo) | ✅ | ✅ | - Campaign |   |
| [Gender](https://developers.google.com/google-ads/api/reference/rpc/v25/GenderInfo) | ✅ | ✅ | - Campaign - Ad group |   |
| [Income range](https://developers.google.com/google-ads/api/reference/rpc/v25/IncomeRangeInfo) | ✅ | ✅ | - Campaign - Ad group |   |
| [IP block](https://developers.google.com/google-ads/api/reference/rpc/v25/IpBlockInfo) | ✅ | ✅ | - Campaign - Customer |   |
| [Keyword](https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordInfo) | ✅ | ✅ | - Campaign - Ad group | At the campaign level, you can only exclude keywords. |
| [Keyword theme](https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordThemeInfo) | ✅ | ✅ | - Campaign |   |
| [Language](https://developers.google.com/google-ads/api/reference/rpc/v25/LanguageInfo) | ✅ | ❌ | - Campaign - Ad group |   |
| [Life event](https://developers.google.com/google-ads/api/reference/rpc/v25/LifeEventInfo) | ✅ | ✅ | - Campaign |   |
| [Listing group](https://developers.google.com/google-ads/api/reference/rpc/v25/ListingGroupInfo) | ✅ | ❌ | - Ad group | Tree-based structure for Hotel Ads and Shopping campaigns. See the [guide](https://developers.google.com/google-ads/api/docs/shopping-ads/create-listing-groups). |
| [Listing scope](https://developers.google.com/google-ads/api/reference/rpc/v25/ListingScopeInfo) | ✅ | ❌ | - Campaign |   |
| [Local service ID](https://developers.google.com/google-ads/api/reference/rpc/v25/LocalServiceIdInfo) | ✅ | ❌ | - Campaign | Represents a service type for [Local Services Campaigns](https://developers.google.com/google-ads/api/docs/campaigns/local-service-campaigns). |
| [Location](https://developers.google.com/google-ads/api/reference/rpc/v25/LocationInfo) | ✅ | ✅ | - Campaign - Ad group | See the [guide](https://developers.google.com/google-ads/api/docs/targeting/location-targeting) about location targeting. |
| [Location group](https://developers.google.com/google-ads/api/reference/rpc/v25/LocationGroupInfo) | ✅ | ❌ | - Campaign | Target multiple geographic regions using a distance radius. See the [guide](https://developers.google.com/google-ads/api/docs/targeting/location-targeting) about location targeting. |
| [Mobile app category](https://developers.google.com/google-ads/api/reference/rpc/v25/MobileAppCategoryInfo) | ✅ | ✅ | - Campaign - Ad group - Customer |   |
| [Mobile application](https://developers.google.com/google-ads/api/reference/rpc/v25/MobileApplicationInfo) | ✅ | ✅ | - Campaign - Ad group - Customer |   |
| [Mobile device](https://developers.google.com/google-ads/api/reference/rpc/v25/MobileDeviceInfo) | ✅ | ❌ | - Campaign |   |
| [Negative keyword list](https://developers.google.com/google-ads/api/reference/rpc/v25/NegativeKeywordListInfo) | ❌ | ✅ | - Customer |   |
| [Operating system version](https://developers.google.com/google-ads/api/reference/rpc/v25/OperatingSystemVersionInfo) | ✅ | ❌ | - Campaign |   |
| [Parental status](https://developers.google.com/google-ads/api/reference/rpc/v25/ParentalStatusInfo) | ✅ | ✅ | - Campaign - Ad group | At the campaign level, only negative targeting is supported. |
| [Placement](https://developers.google.com/google-ads/api/reference/rpc/v25/PlacementInfo) | ❌ | ✅ | - Campaign - Ad group - Customer | Limits on URL length (250 chars) and depth (2 levels). adsenseformobileapps.com not allowed. |
| [Placement list](https://developers.google.com/google-ads/api/reference/rpc/v25/PlacementListInfo) | ❌ | ✅ | - Customer | Lets you manage a list of placements to exclude across multiple campaigns. |
| [Proximity](https://developers.google.com/google-ads/api/reference/rpc/v25/ProximityInfo) | ✅ | ❌ | - Campaign | Created using an address or latitude-longitude and a radius. See the [guide](https://developers.google.com/google-ads/api/docs/targeting/location-targeting) about location targeting. |
| [Topic](https://developers.google.com/google-ads/api/reference/rpc/v25/TopicInfo) | ✅ | ✅ | - Campaign - Ad group |   |
| [User interest](https://developers.google.com/google-ads/api/reference/rpc/v25/UserInterestInfo) | ✅ | ✅ | - Campaign - Ad group | Verify the [availabilities](https://developers.google.com/google-ads/api/reference/rpc/v25/UserInterest#availabilities[]) are compatible with the campaign type. Some user interest options are only available for specific campaign types. |
| [User list](https://developers.google.com/google-ads/api/reference/rpc/v25/UserListInfo) | ✅ | ✅ | - Campaign - Ad group | Use the ID of the user list. |
| [Video lineup](https://developers.google.com/google-ads/api/reference/rpc/v25/VideoLineupInfo) | ✅ | ✅ | - Campaign |   |
| [Webpage](https://developers.google.com/google-ads/api/reference/rpc/v25/WebpageInfo) | ✅ | ✅ | - Campaign - Ad group | Used to target or exclude specific pages on an advertiser's website based on conditions. Setting a `Webpage` criterion as negative is used to implement URL exclusions. |
| [YouTube channel](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeChannelInfo) | ✅ | ✅ | - Campaign - Ad group - Customer |   |
| [YouTube video](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeVideoInfo) | ✅ | ✅ | - Campaign - Ad group - Customer |   |




Shared sets let you manage and share a single set of criteria across multiple
resources. Depending on the type of shared set, criteria can be applied at the
campaign, ad group, or account level.

The [`SharedSetType`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType) enum specifies the types of shared sets you can use in
the Google Ads API. This guide shows you how to use a shared set to create and apply a
shared negative keyword list to a campaign. You can follow the same process to
add other types of shared sets to campaigns.

## Create a `SharedSet`

First, create a [`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet) to act as a container for your shared criteria.

When you create the `SharedSet`, specify the [`SharedSetType`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType). For a
campaign-level negative keyword list, use [`NEGATIVE_KEYWORDS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#negative_keywords).

Other types include:

- [`NEGATIVE_PLACEMENTS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#negative_placements): A list of placements (such as websites or apps) to exclude. This type of list can be attached to campaigns with [`CampaignSharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignSharedSet), or to an account with [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion).
- [`ACCOUNT_LEVEL_NEGATIVE_KEYWORDS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#account_level_negative_keywords): A list of negative keywords to exclude from targeting. This type of list must be attached to an account using [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion).
- [`BRANDS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#brands): A list of brands to use in brand restrictions for Search campaigns or to exclude from targeting.

The `SharedSet` creation process involves these steps:

1. Instantiate a [`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet).
2. Set the [`SharedSetType`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType) to [`NEGATIVE_KEYWORDS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#negative_keywords).
3. Provide a `name` to assist with future resource identification.
4. Use the [`SharedSetService`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetService) to create the `SharedSet`.

The response provides the resource name of the newly created `SharedSet`. You
use this name in the next steps.

## Create `SharedCriterion` resources

Next, create [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedCriterion) resources for each item you want to add to
your [`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet). In the case of a negative keyword list, these are your
negative keywords.

Each [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedCriterion) contains:

- A supported [`Criterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedCriterion#criterion) object.
- The resource name of the `SharedSet` you created in the previous step.

To add the negative keywords to your `SharedSet`:

1. For each negative keyword, create a [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedCriterion) object.
2. Within each `SharedCriterion`, create a [`KeywordInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/KeywordInfo) object and set the keyword text and match type.
3. Set the `shared_set` field of the `SharedCriterion` to the resource name of your `SharedSet`.
4. Use the [`SharedCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedCriterionService) to add each `SharedCriterion` to the `SharedSet`.

## Attach a `SharedSet`

Once a `SharedSet` is populated with `SharedCriterion` resources, you can
associate it with other resources in your account. The resource you use to
attach a `SharedSet` depends on its type and the level at which you want to
apply its criteria.

Note that `AssetSet` is a different resource type from `SharedSet` and shouldn't
be confused. If you are looking to group assets like images or videos, or use
features like location groups with Performance Max campaigns, see
[Asset Sets](https://developers.google.com/google-ads/api/docs/assets/overview).

### Campaign level

You can attach shared sets at the campaign level using either
`CampaignSharedSet` or `CampaignCriterion`, depending on the shared set type.

#### `CampaignSharedSet`

Shared sets of type `NEGATIVE_KEYWORDS` or `NEGATIVE_PLACEMENTS` must be
attached to campaigns using the [`CampaignSharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignSharedSet) resource. Negative
criteria attached at the campaign level automatically apply to all ad groups
within that campaign.

To link a `SharedSet` to a campaign as a negative criterion:

1. Create a [`CampaignSharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignSharedSet) object.
2. Set the `campaign` field to the resource name of the campaign you want to add the `SharedSet` to.
3. Set the `shared_set` field to the resource name of the `SharedSet` you created.
4. Use the [`CampaignSharedSetService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignSharedSetService) to create the [`CampaignSharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignSharedSet). This establishes the link between the campaign and the `SharedSet`.

#### `CampaignCriterion`

Shared sets of type `BRANDS` can be attached to campaigns using a
[`CampaignCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion).

To attach a `BRANDS` shared set to a campaign:

1. Create a [`CampaignCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion).
2. Set the `brand_list` field to a [`BrandListInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/BrandListInfo) object.
3. Set `BrandListInfo.shared_set` to the resource name of the `BRANDS` `SharedSet`.
4. Use [`CampaignCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterionService) to create the `CampaignCriterion`.

### Ad group level

Shared sets of type `BRANDS` or [`VERTICAL_ADS_ITEM_GROUP_RULE_LIST`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#vertical_ads_item_group_rule_list) can be
attached at the ad group level using an [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion).

To attach a `BRANDS` shared set to an ad group:

1. Create an [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion).
2. Set the `brand_list` field to a [`BrandListInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/BrandListInfo) object.
3. Set `BrandListInfo.shared_set` to the resource name of the `BRANDS` `SharedSet`.
4. Use [`AdGroupCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterionService) to create the `AdGroupCriterion`.

To attach a `VERTICAL_ADS_ITEM_GROUP_RULE_LIST` shared set to an ad group:

1. Create an [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion).
2. Set the `vertical_ads_item_group_rule_list` field to a [`VerticalAdsItemGroupRuleListInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/VerticalAdsItemGroupRuleListInfo) object.
3. Set `VerticalAdsItemGroupRuleListInfo.shared_set` to the resource name of the `VERTICAL_ADS_ITEM_GROUP_RULE_LIST` `SharedSet`.
4. Use [`AdGroupCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterionService) to create the `AdGroupCriterion`.

### Account level

If you are using a manager account, you can create [`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet) resources
and share them with client accounts that are part of your account hierarchy.

For example, to attach a [`NEGATIVE_PLACEMENTS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#negative_placements) [`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet) in your
manager account to a client account, use a [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion):

1. Create a [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion) object in the client account.
2. Set its `placement_list` field to a [`PlacementListInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/PlacementListInfo) object where `PlacementListInfo.shared_set` is set to the resource name of the `SharedSet` from the manager account.
3. Use the [`CustomerNegativeCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterionService) to create the [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion).

Similarly, you can attach an [`ACCOUNT_LEVEL_NEGATIVE_KEYWORDS`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSetTypeEnum.SharedSetType#account_level_negative_keywords)
[`SharedSet`](https://developers.google.com/google-ads/api/reference/rpc/v25/SharedSet) in your manager account to a client account:

1. Create a [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion) object in the client account.
2. Set its `negative_keyword_list` field to a [`NegativeKeywordListInfo`](https://developers.google.com/google-ads/api/reference/rpc/v25/NegativeKeywordListInfo) object where `NegativeKeywordListInfo.shared_set` is set to the resource name of the `SharedSet` from the manager account.
3. Use the [`CustomerNegativeCriterionService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterionService) to create the [`CustomerNegativeCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerNegativeCriterion).

## Shared keyword set code example


### Java

```java
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.ads.googleads.examples.advancedoperations;

import static com.google.ads.googleads.examples.utils.CodeSampleHelper.getPrintableDateTime;

import com.beust.jcommander.Parameter;
import com.google.ads.googleads.examples.utils.ArgumentNames;
import com.google.ads.googleads.examples.utils.CodeSampleParams;
import com.google.ads.googleads.lib.GoogleAdsClient;
import com.google.ads.googleads.v24.common.KeywordInfo;
import com.google.ads.googleads.v24.enums.KeywordMatchTypeEnum.KeywordMatchType;
import com.google.ads.googleads.v24.enums.SharedSetTypeEnum.SharedSetType;
import com.google.ads.googleads.v24.errors.GoogleAdsError;
import com.google.ads.googleads.v24.errors.GoogleAdsException;
import com.google.ads.googleads.v24.resources.CampaignSharedSet;
import com.google.ads.googleads.v24.resources.SharedCriterion;
import com.google.ads.googleads.v24.resources.SharedSet;
import com.google.ads.googleads.v24.services.CampaignSharedSetOperation;
import com.google.ads.googleads.v24.services.CampaignSharedSetServiceClient;
import com.google.ads.googleads.v24.services.MutateCampaignSharedSetsResponse;
import com.google.ads.googleads.v24.services.MutateSharedCriteriaResponse;
import com.google.ads.googleads.v24.services.MutateSharedCriterionResult;
import com.google.ads.googleads.v24.services.MutateSharedSetsResponse;
import com.google.ads.googleads.v24.services.SharedCriterionOperation;
import com.google.ads.googleads.v24.services.SharedCriterionServiceClient;
import com.google.ads.googleads.v24.services.SharedSetOperation;
import com.google.ads.googleads.v24.services.SharedSetServiceClient;
import com.google.ads.googleads.v24.utils.ResourceNames;
import com.google.common.collect.ImmutableList;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Creates a shared list of negative broad match keywords. It then attaches them to a campaign. */
public class CreateAndAttachSharedKeywordSet {

  private static class CreateAndAttachSharedKeywordSetParams extends CodeSampleParams {

    @Parameter(names = ArgumentNames.CUSTOMER_ID, required = true)
    private Long customerId;

    @Parameter(names = ArgumentNames.CAMPAIGN_ID, required = true)
    private Long campaignId;
  }

  public static void main(String[] args) throws IOException {
    CreateAndAttachSharedKeywordSetParams params = new CreateAndAttachSharedKeywordSetParams();
    if (!params.parseArguments(args)) {

      // Either pass the required parameters for this example on the command line, or insert them
      // into the code here. See the parameter class definition above for descriptions.
      params.customerId = Long.parseLong("INSERT_CUSTOMER_ID_HERE");
      params.campaignId = Long.parseLong("INSERT_CAMPAIGN_ID_HERE");
    }

    GoogleAdsClient googleAdsClient = null;
    try {
      googleAdsClient = GoogleAdsClient.newBuilder().fromPropertiesFile().build();
    } catch (FileNotFoundException fnfe) {
      System.err.printf(
          "Failed to load GoogleAdsClient configuration from file. Exception: %s%n", fnfe);
      System.exit(1);
    } catch (IOException ioe) {
      System.err.printf("Failed to create GoogleAdsClient. Exception: %s%n", ioe);
      System.exit(1);
    }

    try {
      new CreateAndAttachSharedKeywordSet()
          .runExample(googleAdsClient, params.customerId, params.campaignId);
    } catch (GoogleAdsException gae) {
      // GoogleAdsException is the base class for most exceptions thrown by an API request.
      // Instances of this exception have a message and a GoogleAdsFailure that contains a
      // collection of GoogleAdsErrors that indicate the underlying causes of the
      // GoogleAdsException.
      System.err.printf(
          "Request ID %s failed due to GoogleAdsException. Underlying errors:%n",
          gae.getRequestId());
      int i = 0;
      for (GoogleAdsError googleAdsError : gae.getGoogleAdsFailure().getErrorsList()) {
        System.err.printf("  Error %d: %s%n", i++, googleAdsError);
      }
      System.exit(1);
    }
  }

  /**
   * Runs the example.
   *
   * @param googleAdsClient the Google Ads API client.
   * @param customerId the client customer ID.
   * @param campaignId the campaign ID.
   * @throws GoogleAdsException if an API request failed with one or more service errors.
   */
  private void runExample(GoogleAdsClient googleAdsClient, long customerId, long campaignId) {

    // Creates a keywords list to create a shared set of.
    List<String> keywords = Arrays.asList("mars cruise", "mars hotels");

    // Creates shared negative keyword set.
    SharedSet sharedSet =
        SharedSet.newBuilder()
            .setName("API Negative keyword list - " + getPrintableDateTime())
            .setType(SharedSetType.NEGATIVE_KEYWORDS)
            .build();

    SharedSetOperation operation = SharedSetOperation.newBuilder().setCreate(sharedSet).build();

    String sharedSetResourceName;
    try (SharedSetServiceClient sharedSetServiceClient =
        googleAdsClient.getLatestVersion().createSharedSetServiceClient()) {
      MutateSharedSetsResponse response =
          sharedSetServiceClient.mutateSharedSets(
              Long.toString(customerId), ImmutableList.of(operation));
      sharedSetResourceName = response.getResults(0).getResourceName();
      System.out.printf("Created shared set %s%n", sharedSetResourceName);
    }

    List<SharedCriterionOperation> sharedCriterionOperations = new ArrayList<>();
    for (String keyword : keywords) {
      SharedCriterion sharedCriterion =
          SharedCriterion.newBuilder()
              .setKeyword(
                  KeywordInfo.newBuilder()
                      .setText(keyword)
                      .setMatchType(KeywordMatchType.BROAD)
                      .build())
              .setSharedSet(sharedSetResourceName)
              .build();

      SharedCriterionOperation sharedCriterionOperation =
          SharedCriterionOperation.newBuilder().setCreate(sharedCriterion).build();
      sharedCriterionOperations.add(sharedCriterionOperation);
    }

    try (SharedCriterionServiceClient sharedCriterionServiceClient =
        googleAdsClient.getLatestVersion().createSharedCriterionServiceClient()) {
      MutateSharedCriteriaResponse response =
          sharedCriterionServiceClient.mutateSharedCriteria(
              Long.toString(customerId), sharedCriterionOperations);
      System.out.printf("Added %d shared criteria:%n", response.getResultsCount());
      for (MutateSharedCriterionResult result : response.getResultsList()) {
        System.out.printf("\t%s%n", result.getResourceName());
      }
    }

    String campaignResourceName = ResourceNames.campaign(customerId, campaignId);
    CampaignSharedSet campaignSharedSet =
        CampaignSharedSet.newBuilder()
            .setCampaign(campaignResourceName)
            .setSharedSet(sharedSetResourceName)
            .build();

    CampaignSharedSetOperation campaignSharedSetOperation =
        CampaignSharedSetOperation.newBuilder().setCreate(campaignSharedSet).build();

    try (CampaignSharedSetServiceClient campaignSharedSetServiceClient =
        googleAdsClient.getLatestVersion().createCampaignSharedSetServiceClient()) {
      MutateCampaignSharedSetsResponse response =
          campaignSharedSetServiceClient.mutateCampaignSharedSets(
              Long.toString(customerId), ImmutableList.of(campaignSharedSetOperation));
      String campaignSharedSetResourceName = response.getResults(0).getResourceName();
      System.out.printf("Created campaign shared set %s%n", campaignSharedSetResourceName);
    }
  }
}

      
```

### C#

```c#
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

using CommandLine;
using Google.Ads.Gax.Examples;
using Google.Ads.GoogleAds.Lib;
using Google.Ads.GoogleAds.V24.Common;
using Google.Ads.GoogleAds.V24.Errors;
using Google.Ads.GoogleAds.V24.Resources;
using Google.Ads.GoogleAds.V24.Services;
using System;
using System.Collections.Generic;
using static Google.Ads.GoogleAds.V24.Enums.KeywordMatchTypeEnum.Types;
using static Google.Ads.GoogleAds.V24.Enums.SharedSetTypeEnum.Types;

namespace Google.Ads.GoogleAds.Examples.V24
{
    /// <summary>
    /// This code example creates a shared list of negative broad match keywords. It then
    /// attaches them to a campaign.
    /// </summary>
    public class CreateAndAttachSharedKeywordSet : ExampleBase
    {
        /// <summary>
        /// Command line options for running the <see cref="CreateAndAttachSharedKeywordSet"/>
        /// example.
        /// </summary>
        public class Options : OptionsBase
        {
            /// <summary>
            /// The Google Ads customer ID for which the call is made.
            /// </summary>
            [Option("customerId", Required = true, HelpText =
                "The Google Ads customer ID for which the call is made.")]
            public long CustomerId { get; set; }

            /// <summary>
            /// The ID of the campaign for which shared criterion is updated.
            /// </summary>
            [Option("campaignId", Required = true, HelpText =
                "The ID of the campaign for which shared criterion is updated.")]
            public long CampaignId { get; set; }
        }

        /// <summary>
        /// Main method, to run this code example as a standalone application.
        /// </summary>
        /// <param name="args">The command line arguments.</param>
        public static void Main(string[] args)
        {
            Options options = ExampleUtilities.ParseCommandLine<Options>(args);

            CreateAndAttachSharedKeywordSet codeExample = new CreateAndAttachSharedKeywordSet();
            Console.WriteLine(codeExample.Description);
            codeExample.Run(new GoogleAdsClient(), options.CustomerId, options.CampaignId);
        }

        /// <summary>
        /// Returns a description about the code example.
        /// </summary>
        public override string Description =>
            "This code example creates a shared list of negative broad match keywords. It then " +
            "attaches them to a campaign.";

        /// <summary>
        /// Runs the code example.
        /// </summary>
        /// <param name="client">The Google Ads client.</param>
        /// <param name="customerId">The Google Ads customer ID for which the call is made.</param>
        /// <param name="campaignId">The ID of the campaign for which shared criterion is updated.
        /// </param>
        public void Run(GoogleAdsClient client, long customerId, long campaignId)
        {
            SharedSetServiceClient sharedSetService = client.GetService(
                Services.V24.SharedSetService);
            SharedCriterionServiceClient sharedCriterionService =
                client.GetService(Services.V24.SharedCriterionService);
            CampaignSharedSetServiceClient campaignSharedSetService =
                client.GetService(Services.V24.CampaignSharedSetService);

            try
            {
                // Keywords to create a shared set of.
                string[] keywords = new string[] { "mars cruise", "mars hotels" };

                // Create shared negative keyword set.
                SharedSet sharedSet = new SharedSet()
                {
                    Name = "API Negative keyword list - " + ExampleUtilities.GetRandomString(),
                    Type = SharedSetType.NegativeKeywords,
                };
                SharedSetOperation operation = new SharedSetOperation()
                {
                    Create = sharedSet
                };

                MutateSharedSetsResponse sharedSetResponse = sharedSetService.MutateSharedSets(
                    customerId.ToString(), new SharedSetOperation[] { operation });

                string sharedSetResourceName = sharedSetResponse.Results[0].ResourceName;
                Console.WriteLine($"Created shared set {sharedSetResourceName}.");

                // Create negative keywords in the shared set.
                List<SharedCriterionOperation> criterionOperations =
                    new List<SharedCriterionOperation>();

                foreach (string keyword in keywords)
                {
                    SharedCriterion sharedCriterion = new SharedCriterion()
                    {
                        Keyword = new KeywordInfo()
                        {
                            Text = keyword,
                            MatchType = KeywordMatchType.Broad
                        },
                        SharedSet = sharedSetResourceName
                    };
                    criterionOperations.Add(new SharedCriterionOperation()
                    {
                        Create = sharedCriterion
                    });
                }

                MutateSharedCriteriaResponse criteriaResponse =
                    sharedCriterionService.MutateSharedCriteria(
                        customerId.ToString(), criterionOperations);

                foreach (MutateSharedCriterionResult result in criteriaResponse.Results)
                {
                    Console.WriteLine($"Created shared criterion {result.ResourceName}.");
                }

                // Attach shared set to campaign.
                CampaignSharedSet campaignSet = new CampaignSharedSet()
                {
                    Campaign = ResourceNames.Campaign(customerId, campaignId),
                    SharedSet = sharedSetResourceName
                };

                CampaignSharedSetOperation sharedSetoperation = new CampaignSharedSetOperation()
                {
                    Create = campaignSet
                };
                MutateCampaignSharedSetsResponse response =
                    campaignSharedSetService.MutateCampaignSharedSets(customerId.ToString(),
                        new CampaignSharedSetOperation[] { sharedSetoperation });

                Console.WriteLine("Created campaign shared set {0}.",
                    response.Results[0].ResourceName);
            }
            catch (GoogleAdsException e)
            {
                Console.WriteLine("Failure:");
                Console.WriteLine($"Message: {e.Message}");
                Console.WriteLine($"Failure: {e.Failure}");
                Console.WriteLine($"Request ID: {e.RequestId}");
                throw;
            }
        }
    }
}

      
```

### PHP

```php
<?php

/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

namespace Google\Ads\GoogleAds\Examples\AdvancedOperations;

require __DIR__ . '/../../vendor/autoload.php';

use GetOpt\GetOpt;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentNames;
use Google\Ads\GoogleAds\Examples\Utils\ArgumentParser;
use Google\Ads\GoogleAds\Examples\Utils\Helper;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsException;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Util\V24\ResourceNames;
use Google\Ads\GoogleAds\V24\Common\KeywordInfo;
use Google\Ads\GoogleAds\V24\Enums\KeywordMatchTypeEnum\KeywordMatchType;
use Google\Ads\GoogleAds\V24\Enums\SharedSetTypeEnum\SharedSetType;
use Google\Ads\GoogleAds\V24\Errors\GoogleAdsError;
use Google\Ads\GoogleAds\V24\Resources\CampaignSharedSet;
use Google\Ads\GoogleAds\V24\Resources\SharedCriterion;
use Google\Ads\GoogleAds\V24\Resources\SharedSet;
use Google\Ads\GoogleAds\V24\Services\CampaignSharedSetOperation;
use Google\Ads\GoogleAds\V24\Services\MutateCampaignSharedSetsRequest;
use Google\Ads\GoogleAds\V24\Services\MutateSharedCriteriaRequest;
use Google\Ads\GoogleAds\V24\Services\MutateSharedSetsRequest;
use Google\Ads\GoogleAds\V24\Services\SharedCriterionOperation;
use Google\Ads\GoogleAds\V24\Services\SharedSetOperation;
use Google\ApiCore\ApiException;

/**
 * This example creates a shared list of negative broad match keywords. It then attaches them to a
 * campaign.
 */
class CreateAndAttachSharedKeywordSet
{
    private const CUSTOMER_ID = 'INSERT_CUSTOMER_ID_HERE';
    private const CAMPAIGN_ID = 'INSERT_CAMPAIGN_ID_HERE';

    public static function main()
    {
        // Either pass the required parameters for this example on the command line, or insert them
        // into the constants above.
        $options = (new ArgumentParser())->parseCommandArguments([
            ArgumentNames::CUSTOMER_ID => GetOpt::REQUIRED_ARGUMENT,
            ArgumentNames::CAMPAIGN_ID => GetOpt::REQUIRED_ARGUMENT
        ]);

        // Generate a refreshable OAuth2 credential for authentication.
        $oAuth2Credential = (new OAuth2TokenBuilder())->fromFile()->build();

        // Construct a Google Ads client configured from a properties file and the
        // OAuth2 credentials above.
        $googleAdsClient = (new GoogleAdsClientBuilder())->fromFile()
            ->withOAuth2Credential($oAuth2Credential)
            ->build();

        try {
            self::runExample(
                $googleAdsClient,
                $options[ArgumentNames::CUSTOMER_ID] ?: self::CUSTOMER_ID,
                $options[ArgumentNames::CAMPAIGN_ID] ?: self::CAMPAIGN_ID
            );
        } catch (GoogleAdsException $googleAdsException) {
            printf(
                "Request with ID '%s' has failed.%sGoogle Ads failure details:%s",
                $googleAdsException->getRequestId(),
                PHP_EOL,
                PHP_EOL
            );
            foreach ($googleAdsException->getGoogleAdsFailure()->getErrors() as $error) {
                /** @var GoogleAdsError $error */
                printf(
                    "\t%s: %s%s",
                    $error->getErrorCode()->getErrorCode(),
                    $error->getMessage(),
                    PHP_EOL
                );
            }
            exit(1);
        } catch (ApiException $apiException) {
            printf(
                "ApiException was thrown with message '%s'.%s",
                $apiException->getMessage(),
                PHP_EOL
            );
            exit(1);
        }
    }

    /**
     * Runs the example.
     *
     * @param GoogleAdsClient $googleAdsClient the Google Ads API client
     * @param int $customerId the customer ID
     * @param int $campaignId the ID of the campaign
     */
    public static function runExample(
        GoogleAdsClient $googleAdsClient,
        int $customerId,
        int $campaignId
    ) {
        // Create shared negative keyword set.
        $sharedSet = new SharedSet([
            'name' => 'API Negative keyword list - ' . Helper::getPrintableDatetime(),
            'type' => SharedSetType::NEGATIVE_KEYWORDS,
        ]);

        $sharedSetOperation = new SharedSetOperation();
        $sharedSetOperation->setCreate($sharedSet);

        $sharedSetServiceClient = $googleAdsClient->getSharedSetServiceClient();
        $response = $sharedSetServiceClient->mutateSharedSets(MutateSharedSetsRequest::build(
            $customerId,
            [$sharedSetOperation]
        ));

        $sharedSetResourceName = $response->getResults()[0]->getResourceName();
        print 'Created shared set ' . $sharedSetResourceName . PHP_EOL;

        // Creates shared set criteria.
        $sharedCriterionOperations = [];
        // Keywords to create a shared set of.
        $keywords = ['mars cruise', 'mars hotels'];
        foreach ($keywords as $keyword) {
            $sharedCriterion = new SharedCriterion([
                'keyword' => new KeywordInfo([
                    'text' => $keyword,
                    'match_type' => KeywordMatchType::BROAD
                ]),
                'shared_set' => $sharedSetResourceName
            ]);

            $sharedCriterionOperation = new SharedCriterionOperation();
            $sharedCriterionOperation->setCreate($sharedCriterion);
            $sharedCriterionOperations[] = $sharedCriterionOperation;
        }

        $sharedCriterionServiceClient = $googleAdsClient->getSharedCriterionServiceClient();
        $response = $sharedCriterionServiceClient->mutateSharedCriteria(
            MutateSharedCriteriaRequest::build($customerId, $sharedCriterionOperations)
        );

        printf("Added %d shared criteria:%s", $response->getResults()->count(), PHP_EOL);
        foreach ($response->getResults() as $addedSharedCriterion) {
            /** @var SharedCriterion $addedSharedCriterion */
            print "\t" . $addedSharedCriterion->getResourceName() . PHP_EOL;
        }

        // Creates campaign shared set.
        $campaignSharedSet = new CampaignSharedSet([
            'campaign' => ResourceNames::forCampaign($customerId, $campaignId),
            'shared_set' => $sharedSetResourceName
        ]);

        $campaignSharedSetOperation = new CampaignSharedSetOperation();
        $campaignSharedSetOperation->setCreate($campaignSharedSet);

        $campaignSharedSetServiceClient = $googleAdsClient->getCampaignSharedSetServiceClient();
        $response = $campaignSharedSetServiceClient->mutateCampaignSharedSets(
            MutateCampaignSharedSetsRequest::build($customerId, [$campaignSharedSetOperation])
        );

        print 'Created campaign shared set: ' . $response->getResults()[0]->getResourceName()
            . PHP_EOL;
    }
}

CreateAndAttachSharedKeywordSet::main();

      
```

### Python

```python
#!/usr/bin/env python
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Demonstrates how to create a shared list of negative broad match keywords.

Note that the keywords will be attached to the specified campaign.
"""

import argparse
import sys
from typing import List
import uuid

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.ads.googleads.v24.errors.types.errors import GoogleAdsError
from google.ads.googleads.v24.resources.types.campaign_shared_set import (
    CampaignSharedSet,
)
from google.ads.googleads.v24.resources.types.shared_criterion import (
    SharedCriterion,
)
from google.ads.googleads.v24.resources.types.shared_set import SharedSet
from google.ads.googleads.v24.services.services.campaign_service import (
    CampaignServiceClient,
)
from google.ads.googleads.v24.services.services.campaign_shared_set_service import (
    CampaignSharedSetServiceClient,
)
from google.ads.googleads.v24.services.types.campaign_shared_set_service import (
    CampaignSharedSetOperation,
    MutateCampaignSharedSetsResponse,
)
from google.ads.googleads.v24.services.services.shared_criterion_service import (
    SharedCriterionServiceClient,
)
from google.ads.googleads.v24.services.services.shared_set_service import (
    SharedSetServiceClient,
)
from google.ads.googleads.v24.services.types.shared_criterion_service import (
    MutateSharedCriteriaResponse,
    MutateSharedCriterionResult,
    SharedCriterionOperation,
)
from google.ads.googleads.v24.services.types.shared_set_service import (
    MutateSharedSetsResponse,
    SharedSetOperation,
)


def main(client: GoogleAdsClient, customer_id: str, campaign_id: str) -> None:
    campaign_service: CampaignServiceClient = client.get_service(
        "CampaignService"
    )
    shared_set_service: SharedSetServiceClient = client.get_service(
        "SharedSetService"
    )
    shared_criterion_service: SharedCriterionServiceClient = client.get_service(
        "SharedCriterionService"
    )
    campaign_shared_set_service: CampaignSharedSetServiceClient = (
        client.get_service("CampaignSharedSetService")
    )

    # Create shared negative keyword set.
    shared_set_operation: SharedSetOperation = client.get_type(
        "SharedSetOperation"
    )
    shared_set: SharedSet = shared_set_operation.create
    shared_set.name = f"API Negative keyword list - {uuid.uuid4()}"
    shared_set.type_ = client.enums.SharedSetTypeEnum.NEGATIVE_KEYWORDS

    try:
        shared_set_response: MutateSharedSetsResponse = (
            shared_set_service.mutate_shared_sets(
                customer_id=customer_id, operations=[shared_set_operation]
            )
        )
        shared_set_resource_name: str = shared_set_response.results[
            0
        ].resource_name

        print(f'Created shared set "{shared_set_resource_name}".')
    except GoogleAdsException as ex:
        handle_googleads_exception(ex)

    # Keywords to create a shared set of.
    keywords: List[str] = ["mars cruise", "mars hotels"]
    shared_criteria_operations: List[SharedCriterionOperation] = []
    for keyword in keywords:
        shared_criterion_operation: SharedCriterionOperation = client.get_type(
            "SharedCriterionOperation"
        )
        shared_criterion: SharedCriterion = shared_criterion_operation.create
        shared_criterion.keyword.text = keyword
        shared_criterion.keyword.match_type = (
            client.enums.KeywordMatchTypeEnum.BROAD
        )
        shared_criterion.shared_set = shared_set_resource_name
        shared_criteria_operations.append(shared_criterion_operation)
    try:
        response: MutateSharedCriteriaResponse = (
            shared_criterion_service.mutate_shared_criteria(
                customer_id=customer_id, operations=shared_criteria_operations
            )
        )

        shared_criterion_result: MutateSharedCriterionResult
        for shared_criterion_result in response.results:
            print(
                "Created shared criterion "
                f'"{shared_criterion_result.resource_name}".'
            )
    except GoogleAdsException as ex:
        handle_googleads_exception(ex)

    campaign_set_operation: CampaignSharedSetOperation = client.get_type(
        "CampaignSharedSetOperation"
    )
    campaign_set: CampaignSharedSet = campaign_set_operation.create
    campaign_set.campaign = campaign_service.campaign_path(
        customer_id, campaign_id
    )
    campaign_set.shared_set = shared_set_resource_name

    try:
        campaign_shared_set_response: MutateCampaignSharedSetsResponse = (
            campaign_shared_set_service.mutate_campaign_shared_sets(
                customer_id=customer_id, operations=[campaign_set_operation]
            )
        )

        print(
            "Created campaign shared set "
            f'"{campaign_shared_set_response.results[0].resource_name}".'
        )
    except GoogleAdsException as ex:
        handle_googleads_exception(ex)


def handle_googleads_exception(exception: GoogleAdsException) -> None:
    print(
        f'Request with ID "{exception.request_id}" failed with status '
        f'"{exception.error.code().name}" and includes the following errors:'
    )
    error: GoogleAdsError
    for error in exception.failure.errors:
        print(f'\tError with message "{error.message}".')
        if error.location:
            for field_path_element in error.location.field_path_elements:
                print(f"\t\tOn field: {field_path_element.field_name}")
    sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "Adds a list of negative broad match keywords to the "
            "provided campaign, for the specified customer."
        )
    )
    # The following argument(s) should be provided to run the example.
    parser.add_argument(
        "-c",
        "--customer_id",
        type=str,
        required=True,
        help="The Google Ads customer ID.",
    )
    parser.add_argument(
        "-i", "--campaign_id", type=str, required=True, help="The campaign ID."
    )
    args = parser.parse_args()

    # GoogleAdsClient will read the google-ads.yaml configuration file in the
    # home directory if none is specified.
    googleads_client: GoogleAdsClient = GoogleAdsClient.load_from_storage(
        version="v24"
    )

    main(googleads_client, args.customer_id, args.campaign_id)

      
```

### Ruby

```ruby
#!/usr/bin/env ruby
# Encoding: utf-8
#
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example creates a shared list of negative broad match keywords. It then
# attaches them to a campaign.

require "optparse"
require "google/ads/google_ads"
require "date"

def create_and_attach_shared_keyword_set(customer_id, campaign_id)
  # GoogleAdsClient will read a config file from
  # ENV['HOME']/google_ads_config.rb when called without parameters

  client = Google::Ads::GoogleAds::GoogleAdsClient.new

  # Keywords to create a shared set of.
  keywords = ["mars cruise", "mars hotels"]

  # Create shared negative keyword set.
  shared_set = client.resource.shared_set do |ss|
    ss.name = "API Negative keyword list - #{(Time.new.to_f * 1000).to_i}"
    ss.type = :NEGATIVE_KEYWORDS
  end

  operation = client.operation.create_resource.shared_set(shared_set)

  response = client.service.shared_set.mutate_shared_sets(
    customer_id: customer_id,
    operations: [operation],
  )

  shared_set_resource_name = response.results.first.resource_name
  puts "Created shared set #{shared_set_resource_name}"

  shared_criteria = keywords.map do |keyword|
    client.resource.shared_criterion do |sc|
      sc.keyword = client.resource.keyword_info do |kw|
        kw.text = keyword
        kw.match_type = :BROAD
      end
      sc.shared_set = shared_set_resource_name
    end
  end

  operations = shared_criteria.map do |criterion|
    client.operation.create_resource.shared_criterion(criterion)
  end

  response = client.service.shared_criterion.mutate_shared_criteria(
    customer_id: customer_id,
    operations: operations,
  )

  response.results.each do |result|
    puts "Created shared criterion #{result.resource_name}"
  end

  campaign_set = client.resource.campaign_shared_set do |css|
    css.campaign = client.path.campaign(customer_id, campaign_id)
    css.shared_set = shared_set_resource_name
  end

  operation = client.operation.create_resource.campaign_shared_set(campaign_set)

  response = client.service.campaign_shared_set.mutate_campaign_shared_sets(
    customer_id: customer_id,
    operations: [operation],
  )

  puts "Created campaign shared set #{response.results.first.resource_name}"
end

if __FILE__ == $PROGRAM_NAME
  options = {}
  # The following parameter(s) should be provided to run the example. You can
  # either specify these by changing the INSERT_XXX_ID_HERE values below, or on
  # the command line.
  #
  # Parameters passed on the command line will override any parameters set in
  # code.
  #
  # Running the example with -h will print the command line usage.
  options[:customer_id] = 'INSERT_CUSTOMER_ID_HERE'
  options[:campaign_id] = 'INSERT_CAMPAIGN_ID_HERE'

  OptionParser.new do |opts|
    opts.banner = sprintf('Usage: ruby %s [options]', File.basename(__FILE__))

    opts.separator ''
    opts.separator 'Options:'

    opts.on('-C', '--customer-id CUSTOMER-ID', String, 'Customer ID') do |v|
      options[:customer_id] = v
    end

    opts.on('-c', '--campaign-id CAMPAIGN-ID', String, 'Campaign ID') do |v|
      options[:campaign_id] = v
    end

    opts.separator ''
    opts.separator 'Help:'

    opts.on_tail('-h', '--help', 'Show this message') do
      puts opts
      exit
    end
  end.parse!

  begin
    create_and_attach_shared_keyword_set(options.fetch(:customer_id).tr("-", ""),
        options[:campaign_id])
  rescue Google::Ads::GoogleAds::Errors::GoogleAdsError => e
    e.failure.errors.each do |error|
      STDERR.printf("Error with message: %s\n", error.message)
      if error.location
        error.location.field_path_elements.each do |field_path_element|
          STDERR.printf("\tOn field: %s\n", field_path_element.field_name)
        end
      end
      error.error_code.to_h.each do |k, v|
        next if v == :UNSPECIFIED
        STDERR.printf("\tType: %s\n\tCode: %s\n", k, v)
      end
    end
    raise
  end
end

      
```

### Perl

```perl
#!/usr/bin/perl -w
#
# Copyright 2019, Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# This example creates a shared list of negative broad match keywords. It then
# attaches them to a campaign.

use strict;
use warnings;
use utf8;

use FindBin qw($Bin);
use lib "$Bin/../../lib";
use Google::Ads::GoogleAds::Client;
use Google::Ads::GoogleAds::Utils::GoogleAdsHelper;
use Google::Ads::GoogleAds::V24::Resources::SharedSet;
use Google::Ads::GoogleAds::V24::Resources::SharedCriterion;
use Google::Ads::GoogleAds::V24::Resources::CampaignSharedSet;
use Google::Ads::GoogleAds::V24::Common::KeywordInfo;
use Google::Ads::GoogleAds::V24::Enums::SharedSetTypeEnum qw(NEGATIVE_KEYWORDS);
use Google::Ads::GoogleAds::V24::Enums::KeywordMatchTypeEnum qw(BROAD);
use Google::Ads::GoogleAds::V24::Services::SharedSetService::SharedSetOperation;
use
  Google::Ads::GoogleAds::V24::Services::SharedCriterionService::SharedCriterionOperation;
use
  Google::Ads::GoogleAds::V24::Services::CampaignSharedSetService::CampaignSharedSetOperation;
use Google::Ads::GoogleAds::V24::Utils::ResourceNames;

use Getopt::Long qw(:config auto_help);
use Pod::Usage;
use Cwd          qw(abs_path);
use Data::Uniqid qw(uniqid);

# The following parameter(s) should be provided to run the example. You can
# either specify these by changing the INSERT_XXX_ID_HERE values below, or on
# the command line.
#
# Parameters passed on the command line will override any parameters set in
# code.
#
# Running the example with -h will print the command line usage.
my $customer_id = "INSERT_CUSTOMER_ID_HERE";
my $campaign_id = "INSERT_CAMPAIGN_ID_HERE";

sub create_and_attach_shared_keyword_set {
  my ($api_client, $customer_id, $campaign_id) = @_;

  # Create shared negative keyword set.
  my $shared_set = Google::Ads::GoogleAds::V24::Resources::SharedSet->new({
    name => "API Negative keyword list - " . uniqid(),
    type => NEGATIVE_KEYWORDS
  });

  my $shared_set_operation =
    Google::Ads::GoogleAds::V24::Services::SharedSetService::SharedSetOperation
    ->new({
      create => $shared_set
    });

  my $shared_sets_response = $api_client->SharedSetService()->mutate({
      customerId => $customer_id,
      operations => [$shared_set_operation]});

  my $shared_set_resource_name =
    $shared_sets_response->{results}[0]{resourceName};
  printf "Created shared set: '%s'.\n", $shared_set_resource_name;

  # Create shared set criterion.
  my $shared_criterion_operations = [];
  # Keywords to create a shared set of.
  my $keywords = ['mars cruise', 'mars hotels'];
  foreach my $keyword (@$keywords) {
    my $shared_criterion =
      Google::Ads::GoogleAds::V24::Resources::SharedCriterion->new({
        keyword => Google::Ads::GoogleAds::V24::Common::KeywordInfo->new({
            text      => $keyword,
            matchType => BROAD
          }
        ),
        sharedSet => $shared_set_resource_name
      });

    my $shared_criterion_operation =
      Google::Ads::GoogleAds::V24::Services::SharedCriterionService::SharedCriterionOperation
      ->new({
        create => $shared_criterion
      });
    push @$shared_criterion_operations, $shared_criterion_operation;
  }

  my $shared_criteria_response = $api_client->SharedCriterionService()->mutate({
    customerId => $customer_id,
    operations => $shared_criterion_operations
  });

  my $shared_criterion_results = $shared_criteria_response->{results};
  printf "Added %d shared criterion:\n", scalar @$shared_criterion_results;
  foreach my $shared_criterion_result (@$shared_criterion_results) {
    printf "\t%s\n", $shared_criterion_result->{resourceName};
  }

  # Create campaign shared set.
  my $campaign_shared_set =
    Google::Ads::GoogleAds::V24::Resources::CampaignSharedSet->new({
      campaign => Google::Ads::GoogleAds::V24::Utils::ResourceNames::campaign(
        $customer_id, $campaign_id
      ),
      sharedSet => $shared_set_resource_name
    });

  my $campaign_shared_set_operation =
    Google::Ads::GoogleAds::V24::Services::CampaignSharedSetService::CampaignSharedSetOperation
    ->new({
      create => $campaign_shared_set
    });

  my $campaign_shared_sets_response =
    $api_client->CampaignSharedSetService()->mutate({
      customerId => $customer_id,
      operations => [$campaign_shared_set_operation]});

  printf "Created campaign shared set: '%s'.\n",
    $campaign_shared_sets_response->{results}[0]{resourceName};
  return 1;
}

# Don't run the example if the file is being included.
if (abs_path($0) ne abs_path(__FILE__)) {
  return 1;
}

# Get Google Ads Client, credentials will be read from ~/googleads.properties.
my $api_client = Google::Ads::GoogleAds::Client->new();

# By default examples are set to die on any server returned fault.
$api_client->set_die_on_faults(1);

# Parameters passed on the command line will override any parameters set in code.
GetOptions("customer_id=s" => \$customer_id, "campaign_id=i" => \$campaign_id);

# Print the help message if the parameters are not initialized in the code nor
# in the command line.
pod2usage(2) if not check_params($customer_id, $campaign_id);

# Call the example.
create_and_attach_shared_keyword_set($api_client, $customer_id =~ s/-//gr,
  $campaign_id);

=pod

=head1 NAME

create_and_attach_shared_keyword_set

=head1 DESCRIPTION

This example creates a shared list of negative broad match keywords. It then attaches
them to a campaign.

=head1 SYNOPSIS

create_and_attach_shared_keyword_set.pl [options]

    -help                       Show the help message.
    -customer_id                The Google Ads customer ID.
    -campaign_id                The campaign ID.

=cut

      
```

### curl

> [!NOTE]
> **Note:** While a direct REST code sample for this step isn't provided here, you can achieve this using a manual REST request.   
>
> Refer to the Google Ads API REST interface documentation and the method-specific reference pages. You will need to construct the JSON payload based on the proto definitions.   
>
> Key Resources:
>
> - [Using REST](https://developers.google.com/google-ads/api/rest/overview)
> - [REST Interface Structure](https://developers.google.com/google-ads/api/rest/design/overview)
> - [JSON Field Mappings](https://developers.google.com/google-ads/api/rest/design/json-mappings)
> - Consult the [REST API Reference](https://developers.google.com/google-ads/api/reference/rpc/latest/overview) for the specific service and method.

<br />



[Manager accounts](https://support.google.com/google-ads/answer/6139186) are Google
Ads accounts that are used for administrative purposes and not for serving ads.
They act as single points of access for the accounts they manage, so are used
in setting up consolidated billing and other features across multiple accounts.

> [!IMPORTANT]
> **Key Term:** In this guide, "client account" refers to the account being managed by a manager account. This could refer to another manager account or a regular ad-serving Google Ads account.

## Services

The two services that are used to create a link between two accounts in the
Google Ads API are the
[`CustomerClientLinkService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLinkService) and the
[`CustomerManagerLinkService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerManagerLinkService). In the

names for these services, the word "Customer" refers to the *current account* in
the context of the request.

- If you're a manager account looking down at your managed clients, you would employ the [`CustomerClientLinkService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLinkService).
- If you're a client account interested in the link to a manager account above you in the hierarchy, you would select the [`CustomerManagerLinkService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerManagerLinkService).

These two services are essentially two different views of the same link. If
manager account `M` manages client account `C`, then the
[`CustomerClientLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLink) when viewed from
account `M` is the same entity as the
[`CustomerManagerLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerManagerLink) viewed from account
`C`.

## Procedure

Linking two accounts must always be initiated from the manager account, and then
the link must be accepted from the client account. The state of the link is
stored in the `status` field of the
[`CustomerClientLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLink) or
[`CustomerManagerLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerManagerLink). See the [list of
valid statuses](https://developers.google.com/google-ads/api/reference/rpc/v25/ManagerLinkStatusEnum.ManagerLinkStatus). Use
`PENDING` to initiate the link, and `ACTIVE` to accept the link.

Linking two pre-existing Google Ads accounts can be accomplished in three steps.

1. While authenticating as the manager account, extend an invitation to the client account by creating a [`CustomerClientLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLink) with status `PENDING`.
2. While authenticating as the manager account, query the [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) to find the [`manager_link_id`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLink#manager_link_id) of the [`CustomerClientLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerClientLink) you created.
3. While authenticating as the client account, accept the invitation from the manager account by mutating the [`CustomerManagerLink`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerManagerLink) to have status `ACTIVE`.

## Example

The following code example demonstrates how to establish a link between a
manager account and its client:


### Java

```java
private void runExample(GoogleAdsClient googleAdsClient, long clientCustomerId, long managerId) {
  // This example assumes that the same credentials will work for both customers, but that may not
  // be the case. If you need to use different credentials for each customer, then you may either
  // update the client configuration or instantiate two clients, one for each set of credentials.
  // Always make sure you use a GoogleAdsClient with the proper credentials to fetch any services
  // you need to use.

  // Extend an invitation to the client while authenticating as the manager.
  googleAdsClient = googleAdsClient.toBuilder().setLoginCustomerId(managerId).build();

  CustomerClientLinkOperation.Builder clientLinkOp = CustomerClientLinkOperation.newBuilder();
  clientLinkOp
      .getCreateBuilder()
      .setStatus(ManagerLinkStatus.PENDING)
      .setClientCustomer(ResourceNames.customer(clientCustomerId));

  String pendingLinkResourceName;

  try (CustomerClientLinkServiceClient customerClientLinkServiceClient =
      googleAdsClient.getLatestVersion().createCustomerClientLinkServiceClient()) {
    MutateCustomerClientLinkResponse response =
        customerClientLinkServiceClient.mutateCustomerClientLink(
            String.valueOf(managerId), clientLinkOp.build());

    pendingLinkResourceName = response.getResult().getResourceName();

    System.out.printf(
        "Extended an invitation from customer %s to customer %s with client link resource name"
            + " %s%n",
        managerId, clientCustomerId, pendingLinkResourceName);
  }

  // Find the manager_link_id of the link we just created, so we can construct the resource name
  // for the link from the client side.
  String query =
      "SELECT customer_client_link.manager_link_id FROM customer_client_link WHERE"
          + " customer_client_link.resource_name = '"
          + pendingLinkResourceName
          + "'";
  long managerLinkId;

  try (GoogleAdsServiceClient googleAdsServiceClient =
      googleAdsClient.getLatestVersion().createGoogleAdsServiceClient()) {
    SearchPagedResponse response =
        googleAdsServiceClient.search(String.valueOf(managerId), query);
    GoogleAdsRow result = response.iterateAll().iterator().next();
    managerLinkId = result.getCustomerClientLink().getManagerLinkId();
  }

  // Accept the link using the client account.
  CustomerManagerLinkOperation.Builder managerLinkOp = CustomerManagerLinkOperation.newBuilder();
  managerLinkOp
      .getUpdateBuilder()
      .setResourceName(
          ResourceNames.customerManagerLink(clientCustomerId, managerId, managerLinkId))
      .setStatus(ManagerLinkStatus.ACTIVE);

  managerLinkOp.setUpdateMask(FieldMasks.allSetFieldsOf(managerLinkOp.getUpdate()));

  googleAdsClient = googleAdsClient.toBuilder().setLoginCustomerId(clientCustomerId).build();

  try (CustomerManagerLinkServiceClient managerLinkServiceClient =
      googleAdsClient.getLatestVersion().createCustomerManagerLinkServiceClient()) {
    MutateCustomerManagerLinkResponse response =
        managerLinkServiceClient.mutateCustomerManagerLink(
            String.valueOf(clientCustomerId), Arrays.asList(managerLinkOp.build()));
    System.out.printf(
        "Client accepted invitation with resource name %s%n",
        response.getResults(0).getResourceName());
  }
}
      
```

### C#

```c#
public void Run(GoogleAdsClient client, long managerCustomerId, long clientCustomerId)
{
    // Remarks: For ease of understanding, this code example assumes that managerCustomerId
    // and clientCustomerId have the login email (and hence the same credentials work for
    // both accounts). In real life, this might not be the case, so you'd have a separate
    // GoogleAdsClient for managerCustomerId and clientCustomerId.
    try
    {
        // Extend an invitation to the client while authenticating as the manager.
        string customerClientLinkResourceName = CreateInvitation(client, managerCustomerId,
            clientCustomerId);

        // Retrieve the manager link information.
        string managerLinkResourceName = GetManagerLinkResourceName(client,
            managerCustomerId, clientCustomerId,
            customerClientLinkResourceName);

        // Accept the manager's invitation while authenticating as the client.
        AcceptInvitation(client, clientCustomerId, managerLinkResourceName);
    }
    catch (GoogleAdsException e)
    {
        Console.WriteLine("Failure:");
        Console.WriteLine($"Message: {e.Message}");
        Console.WriteLine($"Failure: {e.Failure}");
        Console.WriteLine($"Request ID: {e.RequestId}");
        throw;
    }
}

/// <summary>
/// Extends an invitation from a manager customer to a client customer.
/// </summary>
/// <param name="client">The Google Ads client.</param>
/// <param name="managerCustomerId">The manager customer ID.</param>
/// <param name="clientCustomerId">The client customer ID.</param>
/// <returns>The invitation resource name.</returns>
private string CreateInvitation(GoogleAdsClient client, long managerCustomerId,
    long clientCustomerId)
{
    // Get the CustomerClientLinkService.
    CustomerClientLinkServiceClient customerClientLinkService =
        client.GetService(Services.V25.CustomerClientLinkService);

    // Create a client with the manager customer ID as login customer ID.
    client.Config.LoginCustomerId = managerCustomerId.ToString();

    // Create a customer client link.
    CustomerClientLink customerClientLink = new CustomerClientLink()
    {
        ClientCustomer = ResourceNames.Customer(clientCustomerId),

        // Sets the client customer to invite.
        Status = ManagerLinkStatus.Pending
    };

    // Creates a customer client link operation for creating the one above.
    CustomerClientLinkOperation customerClientLinkOperation =
        new CustomerClientLinkOperation()
        {
            Create = customerClientLink
        };

    // Issue a mutate request to create the customer client link.
    MutateCustomerClientLinkResponse response =
        customerClientLinkService.MutateCustomerClientLink(
            managerCustomerId.ToString(), customerClientLinkOperation);

    // Prints the result.
    string customerClientLinkResourceName = response.Result.ResourceName;
    Console.WriteLine($"An invitation has been extended from the manager " +
        $"customer {managerCustomerId} to the client customer {clientCustomerId} with " +
        $"the customer client link resource name '{customerClientLinkResourceName}'.");

    // Returns the resource name of the created customer client link.
    return customerClientLinkResourceName;
}

/// <summary>
/// Retrieves the manager link resource name of a customer client link given its resource
/// name.
/// </summary>
/// <param name="client">The Google Ads client.</param>
/// <param name="managerCustomerId">The manager customer ID.</param>
/// <param name="clientCustomerId">The client customer ID.</param>
/// <param name="customerClientLinkResourceName">The customer client link resource
/// name.</param>
/// <returns>The manager link resource name.</returns>
private string GetManagerLinkResourceName(GoogleAdsClient client, long managerCustomerId,
    long clientCustomerId, string customerClientLinkResourceName)
{
    // Get the GoogleAdsService.
    GoogleAdsServiceClient googleAdsService =
        client.GetService(Services.V25.GoogleAdsService);

    // Create a client with the manager customer ID as login customer ID.
    client.Config.LoginCustomerId = managerCustomerId.ToString();

    // Creates the query.
    string query = "SELECT customer_client_link.manager_link_id FROM " +
        "customer_client_link WHERE customer_client_link.resource_name = " +
        $"'{customerClientLinkResourceName}'";

    // Issue a search request by specifying the page size.
    GoogleAdsRow result = googleAdsService.Search(
        managerCustomerId.ToString(), query).First();

    // Gets the ID and resource name associated to the manager link found.
    long managerLinkId = result.CustomerClientLink.ManagerLinkId;
    string managerLinkResourceName = ResourceNames.CustomerManagerLink(
        clientCustomerId, managerCustomerId, managerLinkId);
    // Prints the result.
    Console.WriteLine($"Retrieved the manager link of the customer client link: its ID " +
        $"is {managerLinkId} and its resource name is '{managerLinkResourceName}'.");
    // Returns the resource name of the manager link found.
    return managerLinkResourceName;
}

/// <summary>
/// Accepts the invitation.
/// </summary>
/// <param name="client">The Google Ads client.</param>
/// <param name="clientCustomerId">The client customer ID.</param>
/// <param name="managerLinkResourceName">The manager link resource name.</param>
private void AcceptInvitation(GoogleAdsClient client, long clientCustomerId,
    string managerLinkResourceName)
{
    // Get the CustomerManagerLinkService.
    CustomerManagerLinkServiceClient customerManagerLinkService =
        client.GetService(Services.V25.CustomerManagerLinkService);

    // Create a client with the client customer ID as login customer ID.
    client.Config.LoginCustomerId = clientCustomerId.ToString();

    // Creates the customer manager link with the updated status.
    CustomerManagerLink customerManagerLink = new CustomerManagerLink()
    {
        ResourceName = managerLinkResourceName,
        Status = ManagerLinkStatus.Active
    };

    // Creates a customer manager link operation for updating the one above.
    CustomerManagerLinkOperation customerManagerLinkOperation =
        new CustomerManagerLinkOperation()
        {
            Update = customerManagerLink,
            UpdateMask = FieldMasks.AllSetFieldsOf(customerManagerLink)
        };

    // Issue a mutate request to update the customer manager link.
    MutateCustomerManagerLinkResponse response =
            customerManagerLinkService.MutateCustomerManagerLink(
        clientCustomerId.ToString(), new[] { customerManagerLinkOperation }
    );

    // Prints the result.
    Console.WriteLine($"The client {clientCustomerId} accepted the invitation with " +
        $"the resource name '{response.Results[0].ResourceName}");
}
      
```

### PHP

```php
public static function runExample(int $managerCustomerId, int $clientCustomerId)
{
    // Extends an invitation to the client while authenticating as the manager.
    $customerClientLinkResourceName = self::createInvitation(
        $managerCustomerId,
        $clientCustomerId
    );

    // Retrieves the manager link information.
    $managerLinkResourceName = self::getManagerLinkResourceName(
        $managerCustomerId,
        $clientCustomerId,
        $customerClientLinkResourceName
    );

    // Accepts the manager's invitation while authenticating as the client.
    self::acceptInvitation($clientCustomerId, $managerLinkResourceName);
}

/**
 * Extends an invitation from a manager customer to a client customer.
 *
 * @param int $managerCustomerId the manager customer ID
 * @param int $clientCustomerId the customer ID
 * @return string the resource name of the customer client link created for the invitation
 */
private static function createInvitation(
    int $managerCustomerId,
    int $clientCustomerId
) {
    // Creates a client with the manager customer ID as login customer ID.
    $googleAdsClient = self::createGoogleAdsClient($managerCustomerId);

    // Creates a customer client link.
    $customerClientLink = new CustomerClientLink([
        // Sets the client customer to invite.
        'client_customer' => ResourceNames::forCustomer($clientCustomerId),
        'status' => ManagerLinkStatus::PENDING
    ]);

    // Creates a customer client link operation for creating the one above.
    $customerClientLinkOperation = new CustomerClientLinkOperation();
    $customerClientLinkOperation->setCreate($customerClientLink);

    // Issues a mutate request to create the customer client link.
    $customerClientLinkServiceClient = $googleAdsClient->getCustomerClientLinkServiceClient();
    $response = $customerClientLinkServiceClient->mutateCustomerClientLink(
        MutateCustomerClientLinkRequest::build(
            $managerCustomerId,
            $customerClientLinkOperation
        )
    );

    // Prints the result.
    $customerClientLinkResourceName = $response->getResult()->getResourceName();
    printf(
        "An invitation has been extended from the manager customer %d" .
        " to the client customer %d with the customer client link resource name '%s'.%s",
        $managerCustomerId,
        $clientCustomerId,
        $customerClientLinkResourceName,
        PHP_EOL
    );

    // Returns the resource name of the created customer client link.
    return $customerClientLinkResourceName;
}

/**
 * Retrieves the manager link resource name of a customer client link given its resource name.
 *
 * @param int $managerCustomerId the manager customer ID
 * @param int $clientCustomerId the customer ID
 * @param string $customerClientLinkResourceName the customer client link resource name
 * @return string the manager link resource name
 */
private static function getManagerLinkResourceName(
    int $managerCustomerId,
    int $clientCustomerId,
    string $customerClientLinkResourceName
) {
    // Creates a client with the manager customer ID as login customer ID.
    $googleAdsClient = self::createGoogleAdsClient($managerCustomerId);

    // Creates the query.
    $query = "SELECT customer_client_link.manager_link_id FROM customer_client_link" .
        " WHERE customer_client_link.resource_name = '$customerClientLinkResourceName'";

    // Issues a search request.
    $googleAdsServiceClient = $googleAdsClient->getGoogleAdsServiceClient();
    $response = $googleAdsServiceClient->search(
        SearchGoogleAdsRequest::build($managerCustomerId, $query)
    );

    // Gets the ID and resource name associated to the manager link found.
    $managerLinkId = $response->getIterator()->current()
        ->getCustomerClientLink()
        ->getManagerLinkId();
    $managerLinkResourceName = ResourceNames::forCustomerManagerLink(
        $clientCustomerId,
        $managerCustomerId,
        $managerLinkId
    );

    // Prints the result.
    printf(
        "Retrieved the manager link of the customer client link:" .
        " its ID is %d and its resource name is '%s'.%s",
        $managerLinkId,
        $managerLinkResourceName,
        PHP_EOL
    );

    // Returns the resource name of the manager link found.
    return $managerLinkResourceName;
}

/**
 * Accepts an invitation.
 *
 * @param int $clientCustomerId the customer ID
 * @param string $managerLinkResourceName the resource name of the manager link to accept
 */
private static function acceptInvitation(
    int $clientCustomerId,
    string $managerLinkResourceName
) {
    // Creates a client with the client customer ID as login customer ID.
    $googleAdsClient = self::createGoogleAdsClient($clientCustomerId);

    // Creates the customer manager link with the updated status.
    $customerManagerLink = new CustomerManagerLink();
    $customerManagerLink->setResourceName($managerLinkResourceName);
    $customerManagerLink->setStatus(ManagerLinkStatus::ACTIVE);

    // Creates a customer manager link operation for updating the one above.
    $customerManagerLinkOperation = new CustomerManagerLinkOperation();
    $customerManagerLinkOperation->setUpdate($customerManagerLink);
    $customerManagerLinkOperation->setUpdateMask(
        FieldMasks::allSetFieldsOf($customerManagerLink)
    );

    // Issues a mutate request to update the customer manager link.
    $customerManagerLinkServiceClient =
        $googleAdsClient->getCustomerManagerLinkServiceClient();
    $response = $customerManagerLinkServiceClient->mutateCustomerManagerLink(
        MutateCustomerManagerLinkRequest::build(
            $clientCustomerId,
            [$customerManagerLinkOperation]
        )
    );

    // Prints the result.
    printf(
        "The client %d accepted the invitation with the resource name '%s'.%s",
        $clientCustomerId,
        $response->getResults()[0]->getResourceName(),
        PHP_EOL
    );
}
      
```

### Python

```python
def main(
    client: GoogleAdsClient, customer_id: str, manager_customer_id: str
) -> None:
    # This example assumes that the same credentials will work for both
    # customers, but that may not be the case. If you need to use different
    # credentials for each customer, then you may either update the client
    # configuration or instantiate two clients, where at least one points to
    # a specific configuration file so that both clients don't read the same
    # file located in the $HOME dir.
    customer_client_link_service: CustomerClientLinkServiceClient = (
        client.get_service("CustomerClientLinkService")
    )

    # Extend an invitation to the client while authenticating as the manager.
    client_link_operation: CustomerClientLinkOperation = client.get_type(
        "CustomerClientLinkOperation"
    )
    client_link: CustomerClientLink = client_link_operation.create
    client_link.client_customer = customer_client_link_service.customer_path(
        customer_id
    )
    # client_link.status expects an enum value (int)
    client_link.status = client.enums.ManagerLinkStatusEnum.PENDING.value

    response: MutateCustomerClientLinkResponse = (
        customer_client_link_service.mutate_customer_client_link(
            customer_id=manager_customer_id, operation=client_link_operation
        )
    )
    resource_name: str = response.results[0].resource_name

    print(
        f'Extended an invitation from customer "{manager_customer_id}" to '
        f'customer "{customer_id}" with client link resource_name '
        f'"{resource_name}"'
    )

    # Find the manager_link_id of the link we just created, so we can construct
    # the resource name for the link from the client side. Note that since we
    # are filtering by resource_name, a unique identifier, only one
    # customer_client_link resource will be returned in the response
    query = f'''
        SELECT
            customer_client_link.manager_link_id
        FROM
            customer_client_link
        WHERE
            customer_client_link.resource_name = "{resource_name}"'''

    ga_service: GoogleAdsServiceClient = client.get_service("GoogleAdsService")
    manager_link_id: int = -1  # Initialize with a default value

    try:
        search_response: SearchPagedResponse = ga_service.search(
            customer_id=manager_customer_id, query=query
        )
        # Since the googleads_service.search method returns an iterator we need
        # to initialize an iteration in order to retrieve results, even though
        # we know the query will only return a single row.
        row: GoogleAdsRow
        for row in search_response:  # Assuming direct iteration
            manager_link_id = row.customer_client_link.manager_link_id
    except GoogleAdsException as ex:
        # handle_googleads_exception(ex) # This function is not defined here
        print(f"GoogleAdsException: {ex}")  # Basic error handling
        sys.exit(1)

    customer_manager_link_service: CustomerManagerLinkServiceClient = (
        client.get_service("CustomerManagerLinkService")
    )
    manager_link_operation: CustomerManagerLinkOperation = client.get_type(
        "CustomerManagerLinkOperation"
    )
    manager_link: CustomerManagerLink = manager_link_operation.update
    manager_link.resource_name = (
        customer_manager_link_service.customer_manager_link_path(
            customer_id,
            manager_customer_id,
            manager_link_id,  # type: ignore
        )
    )

    # manager_link.status expects an enum value (int)
    manager_link.status = client.enums.ManagerLinkStatusEnum.ACTIVE.value
    # manager_link_operation.update_mask is a FieldMask
    update_mask: FieldMask = protobuf_helpers.field_mask(None, manager_link._pb)
    client.copy_from(
        manager_link_operation.update_mask,
        update_mask,
    )

    mutate_manager_link_response: MutateCustomerManagerLinkResponse = (
        customer_manager_link_service.mutate_customer_manager_link(
            customer_id=customer_id, operations=[manager_link_operation]
        )
    )
    print(
        "Client accepted invitation with resource_name: "
        f'"{mutate_manager_link_response.results[0].resource_name}"'
    )
      
```

### Ruby

```ruby
def link_manager_to_client(manager_customer_id, client_customer_id)
  # GoogleAdsClient will read a config file from
  # ENV['HOME']/google_ads_config.rb when called without parameters
  client = Google::Ads::GoogleAds::GoogleAdsClient.new

  # This example assumes that the same credentials will work for both customers,
  # but that may not be the case. If you need to use different credentials
  # for each customer, then you may either update the client configuration or
  # instantiate two clients, one for each set of credentials. Always make sure
  # to update the configuration before fetching any services you need to use.

  # Extend an invitation to the client while authenticating as the manager.
  client.configure do |config|
    config.login_customer_id = manager_customer_id.to_i
  end

  client_link = client.resource.customer_client_link do |link|
    link.client_customer = client.path.customer(client_customer_id)
    link.status = :PENDING
  end

  client_link_operation = client.operation.create_resource.customer_client_link(client_link)

  response = client.service.customer_client_link.mutate_customer_client_link(
    customer_id: manager_customer_id,
    operation: client_link_operation,
  )

  client_link_resource_name = response.result.resource_name
  puts "Extended an invitation from customer #{manager_customer_id} to " \
      "customer #{client_customer_id} with client link resource name " \
      "#{client_link_resource_name}."

  # Find the manager_link_id of the link we just created, so we can construct
  # the resource name for the link from the client side.
  query = <<~QUERY
    SELECT
      customer_client_link.manager_link_id
    FROM
      customer_client_link
    WHERE
      customer_client_link.resource_name = '#{client_link_resource_name}'
  QUERY

  response = client.service.google_ads.search(customer_id: manager_customer_id, query: query)
  manager_link_id = response.first.customer_client_link.manager_link_id

  # Accept the link using the client account.
  client.configure do |config|
    config.login_customer_id = client_customer_id.to_i
  end

  manager_link_resource_name = client.path.customer_manager_link(
    client_customer_id,
    manager_customer_id,
    manager_link_id,
  )

  manager_link_operation =
      client.operation.update_resource.customer_manager_link(manager_link_resource_name) do |link|
    link.status = :ACTIVE
  end

  response = client.service.customer_manager_link.mutate_customer_manager_link(
    customer_id: client_customer_id,
    operations: [manager_link_operation],
  )

  puts "Client accepted invitation with resource name " \
      "#{response.results.first.resource_name}."
end
      
```

### Perl

```perl
sub link_manager_to_client {
  my ($api_client, $manager_customer_id, $api_client_customer_id) = @_;

  # Step 1: Extend an invitation to the client customer while authenticating
  # as the manager.
  $api_client->set_login_customer_id($manager_customer_id);

  # Create a customer client link.
  my $api_client_link =
    Google::Ads::GoogleAds::V25::Resources::CustomerClientLink->new({
      clientCustomer =>
        Google::Ads::GoogleAds::V25::Utils::ResourceNames::customer(
        $api_client_customer_id),
      status => PENDING
    });

  # Create a customer client link operation.
  my $api_client_link_operation =
    Google::Ads::GoogleAds::V25::Services::CustomerClientLinkService::CustomerClientLinkOperation
    ->new({
      create => $api_client_link
    });

  # Add the customer client link to extend an invitation to the client customer.
  my $api_client_link_response =
    $api_client->CustomerClientLinkService()->mutate({
      customerId => $manager_customer_id,
      operation  => $api_client_link_operation
    });

  my $api_client_link_resource_name =
    $api_client_link_response->{result}{resourceName};

  printf "Extended an invitation from the manager customer %d to the " .
    "client customer %d with the customer client link resource name: '%s'.\n",
    $manager_customer_id, $api_client_customer_id,
    $api_client_link_resource_name;

  # Step 2: Get the 'manager_link_id' of the client link we just created,
  # to construct the resource name of the manager link from the client side.
  my $search_query =
    "SELECT customer_client_link.manager_link_id FROM customer_client_link " .
"WHERE customer_client_link.resource_name = '$api_client_link_resource_name'";

  my $search_response = $api_client->GoogleAdsService()->search({
    customerId => $manager_customer_id,
    query      => $search_query
  });

  my $manager_link_id =
    $search_response->{results}[0]{customerClientLink}{managerLinkId};

  my $manager_link_resource_name =
    Google::Ads::GoogleAds::V25::Utils::ResourceNames::customer_manager_link(
    $api_client_customer_id, $manager_customer_id, $manager_link_id);

  # Step 3: Accept the manager customer's link invitation while authenticating
  # as the client.
  $api_client->set_login_customer_id($api_client_customer_id);

  # Create a customer manager link.
  my $manager_link =
    Google::Ads::GoogleAds::V25::Resources::CustomerManagerLink->new({
      resourceName => $manager_link_resource_name,
      status       => ACTIVE
    });

  # Create a customer manager link operation.
  my $manager_link_operation =
    Google::Ads::GoogleAds::V25::Services::CustomerManagerLinkService::CustomerManagerLinkOperation
    ->new({
      update     => $manager_link,
      updateMask => all_set_fields_of($manager_link)});

  # Update the customer manager link to accept the invitation.
  my $manager_link_response =
    $api_client->CustomerManagerLinkService()->mutate({
      customerId => $api_client_customer_id,
      operations => [$manager_link_operation]});

  printf "The client customer %d accepted the invitation with " .
    "the customer manager link resource name: '%s'.\n",
    $api_client_customer_id,
    $manager_link_response->{results}[0]{resourceName};

  return 1;
}
      
```

### curl

> [!NOTE]
> **Note:** While a direct REST code sample for this step isn't provided here, you can achieve this using a manual REST request.   
>
> Refer to the Google Ads API REST interface documentation and the method-specific reference pages. You will need to construct the JSON payload based on the proto definitions.   
>
> Key Resources:
>
> - [Using REST](https://developers.google.com/google-ads/api/rest/overview)
> - [REST Interface Structure](https://developers.google.com/google-ads/api/rest/design/overview)
> - [JSON Field Mappings](https://developers.google.com/google-ads/api/rest/design/json-mappings)
> - Consult the [REST API Reference](https://developers.google.com/google-ads/api/reference/rpc/latest/overview) for the specific service and method.

<br />





An [`Audience`](https://developers.google.com/google-ads/api/reference/rpc/v25/Audience) is a reusable collection of focused
segments, demographic targeting, and exclusions. Audience targeting is supported
for [Performance Max](https://support.google.com/google-ads/answer/10724817) and
[Demand Gen](https://support.google.com/google-ads/answer/9176876) campaigns. If you
want to target audience segments directly in a Display, Search, Video, Hotel or
Standard Shopping campaign, navigate to [Audience
segments](https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/getting-started).

## Create audiences

Create and update an audience using the
[AudienceService](https://developers.google.com/google-ads/api/reference/rpc/v25/AudienceService). Each [`Audience`](https://developers.google.com/google-ads/api/reference/rpc/v25/Audience) must have a unique name. This reusable audience allows a
combination of multiple audience dimensions:

- [Audience segments](https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/getting-started)
  - [User list segments](https://developers.google.com/google-ads/api/reference/rpc/v25/UserListSegment)
  - [Affinity or in-market segments](https://developers.google.com/google-ads/api/reference/rpc/v25/UserInterestSegment)
  - [Life event segments](https://developers.google.com/google-ads/api/reference/rpc/v25/LifeEventSegment)
  - [Detailed demographic segments](https://developers.google.com/google-ads/api/reference/rpc/v25/DetailedDemographicSegment)
  - [Custom audience segments](https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/custom-audiences)
- Age: [`AgeDimension`](https://developers.google.com/google-ads/api/reference/rpc/v25/AgeDimension)
- Gender: [`GenderDimension`](https://developers.google.com/google-ads/api/reference/rpc/v25/GenderDimension)
- Household income: [`HouseholdIncomeDimension`](https://developers.google.com/google-ads/api/reference/rpc/v25/HouseholdIncomeDimension)
- Parental status: [`ParentalStatusDimension`](https://developers.google.com/google-ads/api/reference/rpc/v25/ParentalStatusDimension)

> [!NOTE]
> **Note:** Only [`UserListSegment`](https://developers.google.com/google-ads/api/reference/rpc/v25/UserListSegment)---a wrapper for a [`UserList`](https://developers.google.com/google-ads/api/reference/rpc/v25/UserList) referenced within an `Audience`---can be used in an [`exclusion_dimension`](https://developers.google.com/google-ads/api/reference/rpc/v25/AudienceExclusionDimension).

## Retrieve audiences

As with other resources, you can use
[`GoogleAdsService.SearchStream`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/SearchStream)
to retrieve attributes of audiences.

    SELECT
      audience.id,
      audience.resource_name,
      audience.name,
      audience.status,
      audience.description,
      audience.dimensions,
      audience.exclusion_dimension
    FROM audience

## Target audiences

Audiences can be targeted in multiple ways depending on the campaign type.

### Asset group signals

Performance Max campaigns use an
[`AssetGroupSignal`](https://developers.google.com/google-ads/api/reference/rpc/v25/AssetGroupSignal) to target audiences. See
the [Asset Groups](https://developers.google.com/google-ads/api/performance-max/asset-group-signals) guide to learn how to target
audiences using asset group signals.

### Ad group criterion

Demand Gen campaigns support adding audience ad group criterion using
[`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion) to target audiences.

Here are the steps to set up audience targeting:

#### Enable audience targeting in the `AdGroup`

You must enable audience targeting in the `AdGroup` by setting
[`use_audience_grouped`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup.AudienceSetting#use_audience_grouped)
to `true` when the ad group is created.

This lets you add `AdGroupCriterion` with audiences. If this value is not
set to `true`, then your request later to target the audience will fail.

#### Create an `AdGroupCriterion`

Create an `AdGroupCriterion`, and set the
[`audience`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion#audience) field to the resource name
of the audience that was created earlier in this guide.

#### Optional: Enable audience targeting in the Campaign

You can optionally set
[`use_audience_grouped`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign.AudienceSetting#use_audience_grouped)
to `true` when the campaign is created. With this setting, you receive an
error if you try to add criteria that would exclude segments and demographics
at the campaign level.

## Best practices

- **Use audiences for persona building.** Audiences are best used in Performance Max and Demand Gen campaigns where you want to layer multiple segments and demographic criteria to target a specific persona.
- **Use audience segments for direct targeting.** For Display, Search, Video, Hotel, and standard Shopping campaigns, or when you only need to target a single segment (like a remarketing list), use [Audience
  segments](https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/getting-started) instead of Audiences.

## Common errors

When creating or updating an [`Audience`](https://developers.google.com/google-ads/api/reference/rpc/v25/Audience), the Google Ads API
validates the request and returns errors from the
[`AudienceError`](https://developers.google.com/google-ads/api/reference/rpc/v25/AudienceErrorEnum.AudienceError) enum if
validation fails.

| `AudienceError` ||
|---|---|
| `AUDIENCE_SEGMENT_NOT_FOUND` | | Summary | An audience segment in the request was not found. | | Common causes | Referencing a segment ID that does not exist or is inaccessible. | | How to handle | Ensure all segment IDs exist and are accessible before creating or updating an audience. | | Prevention tips | Validate segment IDs before including them in an audience. | |---|---| |
| `DIMENSION_INVALID` | | Summary | An audience dimension is invalid. | | Common causes | Including `detailed_demographic` in `exclusion_dimension`. | | How to handle | Only use `user_list` for exclusions in `exclusion_dimension`. | | Prevention tips | Ensure only `user_list` is used in `exclusion_dimension` when creating or updating an audience. | |---|---| |
| `DUPLICATE_AUDIENCE_SEGMENT` | | Summary | The audience contains duplicate segments. | | Common causes | Adding the same segment multiple times to the same audience. | | How to handle | Remove duplicate segments from the audience definition. | | Prevention tips | Ensure all segments in an audience are unique. | |---|---| |
| `NAME_ALREADY_IN_USE` | | Summary | The audience name is already in use. | | Common causes | Attempting to create multiple audiences with the same name. | | How to handle | Use a unique name when creating an audience. | | Prevention tips | Check for existing audience names before creating a new one. | |---|---| |
| `TOO_MANY_DIMENSIONS_OF_SAME_TYPE` | | Summary | The audience contains too many dimensions of the same type. | | Common causes | Including multiple dimensions of the same type (for example, multiple age dimensions) in one audience. | | How to handle | Ensure the audience definition contains only one dimension of each type. | | Prevention tips | Review the audience definition to ensure no duplicate dimension types are included. | |---|---| |
| `TOO_MANY_SEGMENTS` | | Summary | The audience contains too many segments. | | Common causes | Exceeding the maximum allowed number of segments in an audience. | | How to handle | Reduce the number of segments in the audience definition. | | Prevention tips | Check documentation for limits on the number of segments per audience. | |---|---| |



This document explains the different terms used to describe accounts in the
Google Ads API and how they relate to each other.

## Overview

The Google Ads API uses several terms to describe accounts, which can sometimes lead to
confusion. Understanding these distinctions is important for managing accounts
and interpreting API responses.

## Account types

The following definitions clarify the different account types you will encounter
when working with the Google Ads API.

### Manager Account

A **Manager Account** is a primary account used to manage multiple Google Ads
accounts.

- **Former Name:** This was formerly known as "MCC" (My Client Center). You may still see this term in legacy documentation or discussions.
- **Purpose:** You typically need a Manager Account to obtain a developer token and access the API. It lets you link to and manage other accounts.

### Serving Account

A **Serving Account** (or Advertiser Account) is an individual Google Ads account
that runs ad campaigns.

- **Purpose:** This is where campaigns, ad groups, and ads are created and served.

### Client Account

A **Client Account** is any account (either a Serving Account or another
Manager Account) that is linked to and managed by a superior Manager Account
within the hierarchy.

- **Context:** The term "Client" refers to the relationship in the hierarchy (managed by a manager), not necessarily a "client" in the business sense.

### Customer

In the API context, a **Customer** is the resource representing *any* Google
Ads account, whether it's a Manager Account or a Serving Account.

- **Representation:** All accounts are represented by a [`Customer`](https://developers.google.com/google-ads/api/reference/rpc/v25/Customer) resource, identified by a `customer_id`.
- **Role:** The nature of the account (Manager or Serving) depends on the specific resource.

### Test Account

[**Test Accounts**](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts) are special accounts
created under a Manager Account specifically for testing API integrations.

- **Purpose:** They allow you to test API calls without serving live ads or incurring costs. They don't serve live ads.

## Hierarchy Example

A typical hierarchy looks like this:

- **Manager Account A** (Top level)
  - **Client Account B** (Serving account)
  - **Client Account C** (Another Manager account)
    - **Client Account D** (Serving account)

In this example:

- Account A is a Manager Account.
- Accounts B, C, and D are Client Accounts relative to their parents.
- Accounts B and D are Serving Accounts.
- Account C is both a Client Account (to A) and a Manager Account (to D).



[Video: Check out the Services and Resources talk from the 2019 workshop](https://www.youtube.com/watch?v=2GWx6jI7Ib4&list=None&start=454)

This guide introduces the primary components that make up the Google Ads API. The
Google Ads API consists of *resources* and *services*. A resource represents a Google Ads
entity, while services retrieve and manipulate Google Ads entities.

## Object hierarchy

A Google Ads account can be viewed as a hierarchy of objects.

![Campaign model](https://developers.google.com/static/google-ads/api/images/gaa-campaign-model.png)

- The top-level resource of an account is the
  [customer](https://developers.google.com/google-ads/api/reference/rpc/v25/Customer).

- Each customer contains one or more active
  [campaigns](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign).

- Each campaign contains one or more [ad groups](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup), used
  to group your ads into logical collections.

- An [ad group ad](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupAd) represents an ad that you're
  running. Except for app campaigns which can have only one ad group ad per ad
  group, each ad group contains one or more ad group ads.

You can attach one or more [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupCriterion)
or [`CampaignCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignCriterion) to an ad group or
campaign. These represent criteria that define how ads get triggered.

There are many [criterion types](https://developers.google.com/google-ads/api/reference/rpc/v25/CriterionTypeEnum.CriterionType),
such as keywords, age ranges, and locations. Criteria defined at the campaign
level affect all other resources within the campaign. You can also specify
campaign-wide budgets and dates.

Finally, you can attach assets at the account, campaign, or ad group level.
Assets allow you to provide extra information to your ads, like phone numbers,
street addresses, or promotions. See [Assets overview](https://developers.google.com/google-ads/api/docs/assets/overview).

## Resources

Resources represent the entities within your Google Ads account. [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign) and [`AdGroup`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup) are two examples
of resources.

### Object IDs

Every object in Google Ads is identified by its own ID. Some of these IDs are
globally unique across all Google Ads accounts, while others are unique only within
a confined scope.

| Object ID | Scope of Uniqueness | Globally Unique? |
|---|---|---|
| Budget ID | Global | Yes |
| Campaign ID | Global | Yes |
| AdGroup ID | Global | Yes |
| Ad ID | Ad Group | No, but (`AdGroupId`, `AdId`) pair is globally unique |
| AdGroupCriterion ID | Ad Group | No, but (`AdGroupId`, `CriterionId`) pair is globally unique |
| CampaignCriterion ID | Campaign | No, but (`CampaignId`, `CriterionId`) pair is globally unique |
| Label ID | Customer | No, but (`CustomerId`, `LabelId`) pair is globally unique |
| UserList ID | Global | Yes |
| Asset ID | Global | Yes |

These ID rules can be useful when designing local storage for your Google Ads
objects.

Some objects can be used for multiple entity types. In such cases, the object
contains a `type` field that describes its contents. For example,
[`AdGroupAd`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupAd) can refer to an object such as a text ad,
hotel ad, or local ad. This value can be accessed through the
[`AdGroupAd.ad.type`](https://developers.google.com/google-ads/api/reference/rpc/v25/Ad#type) field, and returns a value in the
[`AdType`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdTypeEnum.AdType) enum.

### Resource names

Each resource is uniquely identified by a `resource_name` string, that
concatenates the resource and its parents into a path. For example, campaign
resource names have the form:

    customers/customer_id/campaigns/campaign_id

So for a campaign with ID `987654` in the Google Ads account with customer ID
`1234567`, the `resource_name` would be:

    customers/1234567/campaigns/987654

## Services

Services let you retrieve and modify your Google Ads entities. There are three types
of services: modification, object and stat retrieval, and metadata retrieval
services.

### Modify (mutate) objects

These services modify instances of an associated resource type using a `mutate`
request. They also supply a `get` request that retrieves a single resource
instance, which can be useful for examining the structure of a resource.

> [!IMPORTANT]
> **Key Point:** `get` requests are limited to 1,000 per day. For most real-world use cases, you should instead request reports using [`GoogleAdsService`](https://developers.google.com/google-ads/api/docs/concepts/api-structure#get_objects_and_performance_stats).

Examples of services:

- [`CustomerService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerService) for modifying
  [customers](https://developers.google.com/google-ads/api/reference/rpc/v25/Customer).

- [`CampaignService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignService) for modifying
  [campaigns](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign).

- [`AdGroupService`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupService) for modifying [ad groups](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup).

Each `mutate` request must include corresponding `operation` objects. For
example, the `CampaignService.MutateCampaigns` method expects one or more
instances of [`CampaignOperation`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignOperation). See
[Changing and Inspecting Objects](https://developers.google.com/google-ads/api/docs/concepts/changing-objects) for a
detailed discussion of operations.

#### Concurrent mutates

A Google Ads object cannot be modified concurrently by more than one source. This
could cause errors to arise if you have multiple users updating the same object
with your app, or if you're mutating Google Ads objects in parallel using multiple
threads. This includes updating the object from multiple threads in the same
application, or from different applications (for example, your app and a
simultaneous Google Ads UI session).

The API does not provide a way to lock an object before updating; if two sources
try to simultaneously mutate an object, the API raises a
[`DatabaseError.CONCURRENT_MODIFICATION_ERROR`](https://developers.google.com/google-ads/api/reference/rpc/v25/DatabaseErrorEnum.DatabaseError).

#### Asynchronous versus synchronous mutates

The Google Ads API mutate methods are synchronous. API calls return a response only
after the objects are mutated, requiring you to wait for a response to each
request. While this approach is relatively straightforward to code, it could
negatively impact load balancing and waste resources if processes are forced to
wait for calls to complete.

An alternate approach is to mutate objects asynchronously using
[`BatchJobService`](https://developers.google.com/google-ads/api/reference/rpc/v25/BatchJobService), which performs batches of
operations on multiple services without waiting for their completion. Once a
batch job is submitted, Google Ads API servers execute operations asynchronously,
freeing processes to perform other operations. You can periodically check the
job status for completion.

See the [Batch Processing guide](https://developers.google.com/google-ads/api/docs/batch-processing/overview) for more on
asynchronous processing.

#### Mutate validation

Most mutate requests can be validated without actually executing the call
against real data. You can test the request for missing parameters and incorrect
field values without actually executing the operation.

To use this feature, set the request's optional `validate_only` boolean field to
`true`. The request would then be fully validated as if it were going to be
executed, but the final execution is skipped. If no errors are found, an empty
response is returned. If validation fails, error messages in the response would
indicate the failure points.

`validate_only` is particularly useful in testing ads for common policy
violations. Ads are automatically rejected if they violate policies such as
having specific words, punctuation, capitalization, or length. A single bad ad
could cause an entire batch to fail. Testing a new ad within a `validate_only`
request can reveal any such violations. Refer to the code example for [handling
policy violation errors](https://developers.google.com/google-ads/api/samples/handle-keyword-policy-violations) to see
this in action.

### Get objects and performance stats

[`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) is the single, unified
service for retrieving objects and performance statistics.

All [`Search`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/Search) and [`SearchStream`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/SearchStream) requests for [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) require a query that specifies the resource to
query, the resource attributes and performance metrics to retrieve, the
predicates to use for filtering the request, and the segments to use to further
break down performance statistics. For more information about query format,
see the [Google Ads Query Language guide](https://developers.google.com/google-ads/api/docs/query/overview).

### Retrieve metadata

<br />

[Video](https://www.youtube.com/watch?v=tGf7ijieyQI)

<br />

[`GoogleAdsFieldService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsFieldService) retrieves
metadata about resources in the Google Ads API, such as the available attributes for a
resource and its data type.

This service provides information needed in constructing a query to
[`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService). For convenience, the
information returned by
[`GoogleAdsFieldService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsFieldService) is also available
in the [fields reference documentation](https://developers.google.com/google-ads/api/docs/concepts/field-service).



> [!NOTE]
> **Objective:** Learn how Google Ads API versioning works.

## Semantic versioning

The Google Ads API follows [semantic versioning](https://semver.org/) where there is a
a major and a minor version. The format of the version is `MAJOR.MINOR` or
`vMAJOR_MINOR`. For example, `v25_0` is a major version, while
`v25_1` is a minor version.

See the [release notes](https://developers.google.com/google-ads/api/docs/release-notes) for past versions.

### Major versions

Major release versions introduce some breaking, backwards incompatible changes.
The version would end in zero with the format `vX_0` where `X` is the major
version number.

Each major version has a separate endpoint. In this example URL, `X` is the
major version number.

    https://googleads.googleapis.com/vX

If you are upgrading from an older major version, then your code may require
changes when you switch to the new major version endpoint. If you are using our
[client libraries](https://developers.google.com/google-ads/api/docs/client-libs), then upgrade to the newest version.
When there is a major version released, we will provide a migration guide that
you should go through to fix any breaking changes in your code.

Examples of breaking changes include:

- Removing or renaming a service, interface, field, method or enum value.
- Changing the type of a field.
- Changing a resource name format.
- Changing the URL format in the HTTP definition.
- Changing output formats such as changing from `0` to `--` as default value.
- Changing the error reason returned from A to B.

### Minor versions

Minor versions only introduce backward-compatible changes. For a minor version,
`vMAJOR_MINOR` would have a `MINOR` number greater than zero.

When a minor version is released, the endpoint that is already in use will
automatically be updated. This won't cause your code to break. You can
continue to use your existing client libraries.

Minor versions include new features or updates that don't affect your
existing code. If you want to use these new features, then upgrade your
[client libraries](https://developers.google.com/google-ads/api/docs/client-libs) to the newest version.

## Sunsets

Periodically, older Google Ads API versions will need to sunset. We will post notices
on the [developer blog](https://ads-developers.googleblog.com/search/label/google_ads_api)
when a version is about to sunset. The
[deprecation schedule](https://developers.google.com/google-ads/api/docs/sunset-dates) is updated with future sunset
dates.



> [!NOTE]
> **Objective:** Understand how to modify objects using the Google Ads API.

As discussed in the [API structure guide](https://developers.google.com/google-ads/api/docs/concepts/api-structure), each
top-level resource in the Google Ads API has a corresponding resource-type-specific
service that supports modifying instances of the resource.

This guide will use [`CampaignService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignService) to
demonstrate modifying [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign) objects, but the same
concepts apply to all other resource-type-specific services.

> [!IMPORTANT]
> **Key Term:** A top-level resource is a [resource](https://developers.google.com/google-ads/api/reference/rpc/v25/overview#resources) whose name does not include a period (`.`). For example, `Campaign` is a top-level resource, but `Campaign.NetworkSettings` is not.

## Change objects

Each resource-type-specific service will have a *mutate* method that accepts a
mutate request. This request consists of:

- A `customerId`
- A collection of operations
- A response content-type setting that determines whether the mutable resource or just the resource name should be returned post mutation.

For example, the `MutateCampaigns` method of `CampaignService` accepts a
[`MutateCampaignsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v25/MutateCampaignsRequest) that consists
of:

- A `customerId`
- A collection of `CampaignOperation` objects
- The `response_content_type` field indicating the preferred response type.

### Operations

An operation object such as a `CampaignOperation` lets you specify the action
that you want to perform on a single resource by setting its `operation` field.
This field is a [oneof field](https://protobuf.dev/programming-guides/proto3/#oneof)
consisting of the following attributes whose type is the resource type:

`create`
:   Creates a new instance of the resource.

`update`

:   Updates the resource to match the attributes of the `update`

    resource. When this field is set, you must also set the `update_mask` of the
    operation, which tells the Google Ads API which attributes to modify during the
    update operation. Each [client library](https://developers.google.com/google-ads/api/docs/client-libs) has a utility
    or helper method that will generate the `update_mask` for you, as
    demonstrated in our [client libraries](https://developers.google.com/google-ads/api/docs/client-libs).

`remove`

:   Removes the resource.

Since the `operation` field is a `oneof` field, you cannot use a single
operation to modify multiple objects. For example, if you want to create one
campaign and remove another campaign, add two instances of `CampaignOperation`
to your request: one with `create` set, and another with `remove` set.

### Batch operations

Although a single operation can only either create, update, or remove a single
resource, a single mutate request can contain multiple operations. You should
combine your operations into a single mutate request instead of sending multiple
mutate requests that each contain a single operation.

For example, if you want to create ten campaigns, you should send a
*single* `MutateCampaignsRequest` that has ten `CampaignOperation` objects.

### Mutate responses

What is returned in the response depends on what was sent in the
[`response_content_type`](https://developers.google.com/google-ads/api/reference/rpc/v25/ResponseContentTypeEnum.ResponseContentType)
of the mutate request. For example, if `MUTABLE_RESOURCE` was specified, then
the [response](https://developers.google.com/google-ads/api/reference/rpc/v25/MutateCampaignsResponse) would contain just the
mutable fields in the campaign. You can then make follow-up mutates on that
resource object without having to reconstruct it.

### Mutate errors

The operations in a given mutate request will only be applied to your Google Ads
account if *every* operation in the request succeeds. Check out the [common
errors guide](https://developers.google.com/google-ads/api/docs/common-errors) for a list of common errors and how to
address them.

## Track changes

To track changes made to objects in your Google Ads account, or to retrieve the
current state of objects, you can use the `change_status` and `change_event`
resources.

- [`change_status`](https://developers.google.com/google-ads/api/docs/change-status) provides a summary of which resources have changed within a given time period.
- [`change_event`](https://developers.google.com/google-ads/api/docs/change-event) provides a detailed history of the changes, including the old and new values of the changed fields.

To query these resources, use the [`GoogleAdsService.SearchStream`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/SearchStream) or [`GoogleAdsService.Search`](https://developers.google.com/google-ads/api/docs/concepts/(%0A/google-ads/api/reference/rpc/v25/GoogleAdsService/Search)) method. Read more about [Report
streaming using GoogleAdsService](https://developers.google.com/google-ads/api/docs/reporting/streaming).



> [!NOTE]
> **Objective:** Understand how to retrieve objects and performance stats using [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService). For reporting concepts, see the [reporting guides](https://developers.google.com/google-ads/api/docs/reporting/overview).

The [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) is the unified object
retrieval and reporting service of the Google Ads API. The service has methods that:

- Retrieve specific attributes of objects.
- Retrieve performance metrics for objects based on a date range.
- Order objects based on their attributes.
- Use conditions to indicate which objects you want returned in the response.
- Limit the number of objects returned.

The [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) can return results in
two ways:

- [`GoogleAdsService.SearchStream`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/SearchStream) returns all rows in a single streaming response which is more efficient for large (greater than 10,000 rows) result sets. This might be more appropriate if your batch application wants to download as much data as fast as possible.
- [`GoogleAdsService.Search`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/Search) breaks up large responses into manageable pages of results. This could be more appropriate if your interactive application displays a page of results at a time.

Learn more about [paging versus streaming](https://developers.google.com/google-ads/api/docs/reporting/streaming).

## Make a request

The search method requires a
[`SearchGoogleAdsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v25/SearchGoogleAdsRequest), which consists
of the following attributes:

- A `customer_id`
- A Google Ads Query Language `query` that indicates which resource to query, the attributes, segments, and metrics to retrieve, and the conditions to use to restrict which objects are returned
- ([`GoogleAdsService.Search`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService/Search) only) An optional `page_token` to retrieve the next batch of results when using [paging](https://developers.google.com/google-ads/api/docs/reporting/paging).

For more information on the Google Ads Query Language, check out the [Google Ads Query Language
guide](https://developers.google.com/google-ads/api/docs/query/overview).

## Process a response

The [`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) returns a list of
[`GoogleAdsRow`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsRow) objects.

Each `GoogleAdsRow` represents an object returned by a query, and consists of a
set of attributes that are populated based on the fields requested in the
`SELECT` clause. Attributes not included in the `SELECT` clause are not
populated on the `GoogleAdsRow` objects in the response.

For example, although an `ad_group_criterion` has a `status` attribute, the
`status` field of the row's `ad_group_criterion` attribute is not populated in a
response for a query where the `SELECT` clause does not include
`ad_group_criterion.status`. Similarly, the `campaign` attribute of the row is
not populated if the `SELECT` clause does not include any fields from the
`campaign` resource.

Each `GoogleAdsRow` can have different attributes and metrics from another row
in the same result set; so the rows should be viewed as objects rather than
fixed rows of a table.

## UNKNOWN enum types

Resources that are returned with a type of `UNKNOWN` are not fully supported in
that API version. These resources could have been created through other
interfaces such as the Google Ads UI. You can select metrics when a resource has a
type of `UNKNOWN`, but you cannot mutate the resource through the API. An
example of this would be a new campaign or ad being introduced in the UI, but
not supported in the API version you are querying.

Here are some considerations to keep in mind:

- A resource with an `UNKNOWN` type can be supported later or stay `UNKNOWN` indefinitely.
- New objects with type `UNKNOWN` can appear at any time. These objects are backward compatible because the enum value is already available. Resources are introduced with this change as they're available so that you have an accurate view of your account. The `UNKNOWN` resource can appear due to new activities in your account through other interfaces, or when a resource is no longer supported.
- `UNKNOWN` resources can have detailed metrics attached to them that are queryable.
- `UNKNOWN` resources are typically fully visible in the Google Ads UI.
- `UNKNOWN` resources generally cannot be mutated.

## Segmentation

The response would contain one `GoogleAdsRow` for each combination of the
following:

- Instance of the main resource specified in the `FROM` clause
- Value of each selected `segment` field

For example, the response for a query that selects `FROM campaign` and has
`segments.ad_network_type` and `segments.date` in the `SELECT` clause would
contain one row for each combination of the following:

- `campaign`
- `segments.ad_network_type`
- `segments.date`

Results are implicitly segmented by each instance of the main resource, not by
the values of the individual fields selected. For example,

    SELECT campaign.status, metrics.impressions
    FROM campaign
    WHERE segments.date DURING LAST_14_DAYS

results in one row per **campaign** , not one row per distinct value of the
`campaign.status` field.




You can use [`GoogleAdsFieldService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsFieldService)
to dynamically request the catalog for resources, resource's fields,
segmentation keys and metrics available in the
[`GoogleAdsService`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoogleAdsService) *Search* and
*SearchStream* methods. The catalog provides metadata that can be used by
Google Ads API clients for validation and construction of Google Ads Query Language statements.

## Sample HTTP request and response

> [!NOTE]
> **Note:** The example shows the underlying HTTP/JSON request as a guide, but you are strongly encouraged to use one of the [client libraries](https://developers.google.com/google-ads/api/docs/client-libs) based on [gRPC](https://grpc.io) to submit your requests.

The request consists of an `HTTP GET` to the Google Ads API server at the following
URL:

    https://googleads.googleapis.com/v25/googleAdsFields/{resource_or_field}

The following example shows a request followed by the response returned from
`GoogleAdsFieldService` for the `ad_group` resource:

### Request

    https://googleads.googleapis.com/v25/googleAdsFields/ad_group

### Response

    {
      "resourceName": "googleAdsFields/ad_group",
      "name": "ad_group",
      "category": "RESOURCE",
      "selectable": false,
      "filterable": false,
      "sortable": false,
      "selectableWith": [
        "campaign",
        "customer",
        "metrics.average_cpc",
        "segments.device",
        ...
      ],
      "attributeResources": [
        "customer",
        "campaign"
      ],

      "metrics": [
        "metrics.conversions",
        "metrics.search_budget_lost_impression_share",
        "metrics.average_cost",
        "metrics.clicks",
        ...
      ],
      "segments": [
        "segments.date",
        "segments.ad_network_type",
        "segments.device",
        ...
      ]
    }

For this example, the important arrays are:

`attributeResources`
:   Resources that can be implicitly joined to the resource in the `FROM`
    clause.

`metrics`
:   Metrics that are available to be selected with the resource in the `FROM`
    clause. Only populated for fields where the `category` is `RESOURCE`.

`segments`
:   Segment keys that can be selected with the resource in the `FROM` clause.
    These segment the metrics specified in the query. Only populated for fields
    where the `category` is `RESOURCE`.

`selectableWith`

[Video](https://www.youtube.com/watch?v=GQybJ_AywRI)

:   The `selectableWith` attribute on a resource or segment field specifies
    other resources, segments, or metrics that can be selected in the same
    GAQL query. This attribute is crucial when you want to include fields from a
    resource or segment that is not specified in the `FROM` clause.

:   When constructing a GAQL query:

    1. The resource in the `FROM` clause is the primary entity. You can always select fields from this resource.
    2. You can also select compatible metrics and segments that are available with the primary entity.
    3. If you include fields from any resource or segment outside of the `FROM` clause, you must ensure that this non-`FROM` resource or segment is compatible with all other fields, segments, and metrics that are selected in the query.

:   The `selectableWith` list for a specific resource (let's call it Resource A)
    contains all the other resources, segments, and metrics that can be selected
    alongside fields from Resource A when Resource A is not the primary entity.

:   **Example:**

:   Consider this example query:
    `SELECT ad_group.id, segments.date, campaign.name FROM ad_group`

    - The `FROM` clause specifies `ad_group`.

    - This query selects `ad_group.id` (from the `FROM` resource),
      `segments.date`, and `campaign.name`.

    - Because `campaign.name` is selected, but `campaign` is not in the `FROM`
      clause, you must verify its compatibility with other selected elements.

    - To ensure this query is valid, the `campaign` resource must be
      compatible with `segments.date` (another field being selected). Therefore,
      you must check the `selectableWith` attribute for the `campaign` resource.
      If `segments.date` is present in `campaign`'s `selectableWith` list, the
      query is valid.

    If you select fields from a resource that is not in the `FROM` clause, that
    resource's `selectableWith` list must include all other segments and
    resources present in your `SELECT` clause.

## Metadata details

You can request the catalog using the `GoogleAdsFieldService` at these levels:

Resource
:   For example, `googleAdsFields/campaign`.

Resource's field
:   For example, `googleAdsFields/campaign.name`.

Segmentation field
:   For example, `googleAdsFields/segments.ad_network_type`.

Metric
:   For example, `googleAdsFields/metrics.clicks`.



This guide describes the common structure of all API calls.

If you're using a client library to interact with the API, you won't need to
know the underlying request details. However, some knowledge about the API call
structure can come in handy when testing and debugging.

Google Ads API is a [gRPC API](https://grpc.io/docs/guides/), with REST bindings. This means
that there are two ways of making calls to the API.

**Preferred**:

1. Create the body of the request as a [protocol buffer](https://developers.google.com/protocol-buffers).

2. Send it to the server using [HTTP/2](https://http2.github.io/).

3. Deserialize the response to a protocol buffer.

4. Interpret the results.

Most of our documentation describes [using gRPC](https://developers.google.com/google-ads/api/reference/rpc/v25).

**Optional**:

1. Create the body of request as a [JSON](https://www.json.org/) object.

2. Send it to the server using HTTP 1.1.

3. Deserialize the response as a JSON object.

4. Interpret the results.

Refer to the [REST interface](https://developers.google.com/google-ads/api/rest/overview) guide for more information
on using REST.

> [!NOTE]
> **Note:** This guide describes the structure and transport headers common to both gRPC and REST protocols.

### Resource names

Most objects in the API are identified by their resource name strings. These
strings also serve as URLs when using the REST interface. See the REST
interface's [Resource Names](https://developers.google.com/google-ads/api/rest/design/resource-names) for their
structure.

> [!IMPORTANT]
> **Key Point:** Check out the [resources
> documentation](https://developers.google.com/google-ads/api/reference/rpc/v25/overview#resources), for all supported resources and their path representation (`resource_name`). The same format is used for other services.

### Composite IDs

If the ID of an object is not globally unique, a composite ID for that object is
constructed by prepending its parent ID and a tilde (\~).

For example, since an ad group ad ID is not globally unique, we prepend its
parent object (ad group) ID to it to make a unique composite ID:

- `AdGroupId` of **`123`** + `~` + `AdGroupAdId` of **`45678`** = composite ad group ad ID of **`123~45678`**.

## Request headers

These are the HTTP headers (or [grpc
metadata](https://grpc.io/docs/what-is-grpc/core-concepts/#metadata)) that accompany
the body in the request:

### Authorization

You must include an OAuth2 access token in the form of `Authorization: Bearer
YOUR_ACCESS_TOKEN` that identifies either a manager account acting on behalf of
a client, or an advertiser directly managing their own account. Directions for
retrieving an access token can be found in the [OAuth2
guide](https://developers.google.com/google-ads/api/docs/oauth/overview). An access token is valid for an hour after you
acquire it; when it expires, refresh the access token to retrieve a new one.
Note that our client libraries automatically refresh expired tokens.

If you encounter authorization errors, ensure you are using the correct
credentials and have sufficient permissions. A `USER_PERMISSION_DENIED` error
indicates that the authenticated user may not have access to the customer
account specified in the request. Refer to [Google Ads Access
Levels](https://support.google.com/google-ads/answer/9978556) for details on managing
permissions.

### developer-token

A developer token is a 22-character string that uniquely identifies a Google Ads API
developer. An example developer token string is `ABcdeFGH93KL-NOPQ_STUv`. The
developer token should be included in the form of `developer-token :
ABcdeFGH93KL-NOPQ_STUv`.

### login-customer-id

This is the customer ID of the authorized customer to use in the request,
without hyphens (`-`). If your access to the customer account is through a
manager account, this header is *required* and must be set to the customer ID of
the manager account. If you fail to include `login-customer-id` when you
authenticate through a manager account, this results in an
`AuthorizationError.USER_PERMISSION_DENIED` error. Review [Common Errors](https://developers.google.com/google-ads/api/docs/common-errors#authorizationerror) for more information on this error
type. For a detailed explanation of how account access is resolved, refer to the
[OAuth access model](https://developers.google.com/google-ads/api/docs/oauth/access-model) guide.

> [!IMPORTANT]
> **Key Term:** The **operating customer** is the customer ID in the request payload. For example, the operating customer in the following [`CampaignBudgetService`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignBudgetService) request is `1234567890`:

```
https://googleads.googleapis.com/v25/customers/1234567890/campaignBudgets:mutate
```

Setting the `login-customer-id` is equivalent to choosing an account in the
Google Ads UI after signing in or clicking on your profile image at the top
right. If you don't include this header, it defaults to the **operating
customer**.

> [!NOTE]
> **Note:** You can retrieve the list of accounts that are *directly* accessible with your OAuth credentials by issuing a [`CustomerService.ListAccessibleCustomers`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerService/ListAccessibleCustomers) request. The `login-customer-id` is not required for this request type, and has no effect on the list of customers returned.

### linked-customer-id

This header is required and used by partners (such as third-party app analytics
providers or data partners) when acting on a linked Google Ads account. This header
must specify the Customer ID of the Google Ads account that has the
[product link](https://developers.google.com/google-ads/api/docs/account-management/linking-product-accounts).

Consider the scenario where a partner needs to make API calls to a Google Ads
account based on a product link.

- **Advertiser** : The Google Ads account being managed or updated by the API call. The ID of the Advertiser account is specified in the request. In REST, this is the `customerId` path parameter (for example, `customers/1111111111/...`), and in gRPC, this is the `customer_id` field in the request.
- **Partner**: The partner account (for example, a third-party app analytics provider or data partner).
- **Linked account** : The Google Ads account that has an established [product link](https://developers.google.com/google-ads/api/docs/account-management/linking-product-accounts) with Partner, granting Partner access to Advertiser.

A user who has access to Partner makes API calls to act on entities in
Advertiser (for example, to upload conversions or manage user lists). Linked
account can be Advertiser itself, or a manager account of Advertiser.

The request headers must be set as follows:

- **`Authorization`**: An OAuth2 token for a user who has access to Partner.
- **`developer-token`**: The developer token for the API application, typically associated with Partner.
- **`login-customer-id`**: The Customer ID of Partner. The authenticated user must have access to this account.
- **`linked-customer-id`**: The Customer ID of Linked account. This header signals that the authorization for this request relies on Linked account's product link with Partner.

There are two linking scenarios:

- If Advertiser has a direct product link with Partner, then Linked account is Advertiser, and `linked-customer-id` must be set to Advertiser's customer ID.
- If Advertiser is managed by a manager account that has a product link with Partner, then Linked account is the manager account, and `linked-customer-id` must be set to the manager's customer ID.

**Example 1: Direct link**

If Advertiser `1111111111` has a direct link with Partner `2222222222`, and
the API call is targeting `customers/1111111111/...`:

    Authorization: Bearer YOUR_ACCESS_TOKEN
    developer-token: YOUR_DEVELOPER_TOKEN
    login-customer-id: 2222222222
    linked-customer-id: 1111111111

**Example 2: Manager link**

If Advertiser `1111111111` is managed by Manager `3333333333`, Manager
`3333333333` has a link with Partner `2222222222`, and the API call is
targeting `customers/1111111111/...`:

    Authorization: Bearer YOUR_ACCESS_TOKEN
    developer-token: YOUR_DEVELOPER_TOKEN
    login-customer-id: 2222222222
    linked-customer-id: 3333333333

## Response headers

The following headers (or [grpc
trailing-metadata](https://grpc.io/docs/what-is-grpc/core-concepts/#metadata)) are
returned with the response body. We recommend that you log these values for
debugging purposes.

### request-id

The `request-id` is a string that uniquely identifies this request.




> [!NOTE]
> **Note:** Google is accepting applicants for this program. [Sign up](https://docs.google.com/forms/d/e/1FAIpQLScw-gWKZlJx3GAyCFYTmXpQ0wffC3NsNyCq_tkHNjNVI_V9Lw/viewform?usp=header_link).

This feature lets your API access levels be managed by a [Google Cloud
organization](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy#organizations), giving you the following benefits:

- **No more need to secure developer tokens:** API access is managed through
  the Google Cloud organization so you no longer need to worry about securing
  developer tokens or leaking them. You can skip sending your developer token
  in your API calls, though you still need to send an access token.

- **Maintain separate Google API Console projects for different apps:**
  Any project linked under the Google Cloud organization inherits the API
  access level of the organization. This lets you create multiple
  Google API Console projects under this organization for purposes such as
  granular project management, separate projects for different apps,
  and multiple Google API Console projects for your team members.

- **Finer quota monitoring and management** : You can [monitor the API
  usage](https://support.google.com/googleapi/answer/7036164) of individual projects
  or [cap API usage](https://support.google.com/googleapi/answer/7035610).

## Prerequisites

- **An approved developer token**

  You should already have an approved developer token to use this option. You
  can find an existing developer token in the API Center in your
  Google Ads manager account. [Sign in](https://ads.google.com/home/tools/manager-accounts/),
  then navigate to Admin \> API center. In the API Center, navigate to
  API Access \> Developer token.
- **A Google Cloud organization**

  The Google Ads API associates your developer token to a Google Cloud organization
  and uses it to determine your
  [API Access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels#access-levels).
  There are multiple ways to create a Google Cloud organization.

  | Scenario | Steps |
  |---|---|
  | You're an existing [Google Workspace](https://workspace.google.com/) or [Google Cloud Identity](https://cloud.google.com/identity) customer | Chances are that you already own an organization resource. You can [Check](https://cloud.google.com/resource-manager/docs/creating-managing-organization#retrieving_your_organization_id) and [create one](https://cloud.google.com/resource-manager/docs/creating-managing-organization#acquiring) if required. |
  | You don't use [Google Workspace](https://workspace.google.com/) or [Google Cloud Identity](https://cloud.google.com/identity) | Sign up for the [free edition](https://cloud.google.com/identity/docs/editions) of Google Cloud Identity. Then [create your organization resource](https://cloud.google.com/resource-manager/docs/creating-managing-organization#acquiring). |
  | None of the preceding options work for you | Explain your scenario when you [sign up for the pilot](https://docs.google.com/forms/d/e/1FAIpQLScw-gWKZlJx3GAyCFYTmXpQ0wffC3NsNyCq_tkHNjNVI_V9Lw/viewform?usp=header_link) and request Google to create an organization resource for you. Google will own and manage this organization resource at no charge. |

- **Prepare your Google API Console projects for the pilot program**

  You need to prepare the Google API Console projects you use with the Google Ads API
  for the pilot program as follows:

  | Scenario | Steps |
  |---|---|
  | You already own a Google Cloud organization or created one in the previous step | Ensure that all the Google API Console projects where you've enabled the Google Ads API is under this organization. If it isn't, [migrate it under the organization](https://cloud.google.com/resource-manager/docs/handle-special-cases#migrating_projects_no_org). If you're an existing [Google Workspace](https://workspace.google.com/) or [Google Cloud Identity](https://cloud.google.com/identity) customer, chances are that the Google API Console projects are already under your organization so you can skip this step. |
  | You don't own a Google Cloud organization and couldn't create one in the previous step | Ensure that you're both an administrator user on your Google Ads API manager account and your Google API Console project. You need this permission to perform additional steps after your pilot application is approved. |

- **An up-to-date API contact email**

  Ensure that your Google Ads API contact email is up-to-date. Your API contact
  details are listed on the API Center page of your Google Ads API manager account.
  [Sign in](https://ads.google.com/home/tools/manager-accounts/), then navigate to
  **TOOLS \& SETTINGS \> SETUP \> API Center**.

## Sign up for the pilot program

[Sign up](https://docs.google.com/forms/d/e/1FAIpQLScw-gWKZlJx3GAyCFYTmXpQ0wffC3NsNyCq_tkHNjNVI_V9Lw/viewform?usp=header_link) for the pilot program. The Google Compliance team will
review your application and email your API contact email address with the
approval status and additional details.

If you requested Google to create a Google Cloud organization for you, there
are a few additional steps involved:

1. Google will create a Google-owned Cloud organization resource for you. All
   the administrators of your Google Ads API manager account will be granted the
   `roles/resourcemanager.projectCreator` role on the newly created
   organization.

2. Google will email your API contact email address with the details of the
   newly created organization resource.

3. You must sign in to your Google API Console account and follow the
   instructions to [move your Google API Console project](https://cloud.google.com/resource-manager/docs/handle-special-cases#migrating_projects_no_org) under
   the new organization.

4. Reply to the email to let Google know that your projects are moved under the
   new organization.

5. The Google Compliance team will review your application and email your API
   contact email address with the approval status and additional details.

## Modify your API requests

You can modify your app to stop sending the `developer-token` header when
making API calls. This is an optional but recommended step. If you're in the
pilot program, the Google Ads API server ignores the `developer-token` if sent as part
of the API requests.

### Java

Coming soon!

### .NET

Download and install version 17.1.0 or newer of the [Google Ads API .NET
library](https://www.nuget.org/packages/Google.Ads.GoogleAds).

Next, modify your code as follows:

    // Create a client.
    GoogleAdsClient client = new GoogleAdsClient();

    // Opt into the pilot.
    client.Config.UseCloudOrgForApiAccess = true;

    // Make the API calls.
    ...

### PHP

Coming soon!

### Python

Coming soon!

### Ruby

Coming soon!

### Perl

Coming soon!

### HTTP client (REST)

Omit the `developer-token` header in your HTTP requests:

    curl -i -X POST https://googleads.googleapis.com/v25/customers/CUSTOMER_ID/googleAds:searchStream \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ACCESS_TOKEN" \
      -H "login-customer-id: LOGIN_CUSTOMER_ID" \
      --data-binary "@query.json"

## Frequently asked questions

Here are some frequently asked questions about Cloud-managed access levels.

### Does this change mean that I need to be a Google Workspace or Google Cloud customer to use the Google Ads API?

No. You need a Google Cloud *organization* which can be obtained in [several
ways](https://developers.google.com/google-ads/api/docs/concepts/no-developer-token#org-options). This requirement is similar to how you need a
Google API Console project to use the Google Ads API today.

### I need to change my API Access levels. How can I do this?

You should continue to use the API Center for now to request any changes to the
[API access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels).

### Is there any downtime for opting in to this pilot?

No, there isn't. The Google Ads API will automatically start using the
organization-level API access levels once it is approved.

### How much effort does it take to participate in this pilot?

Expect [minimal code changes](https://developers.google.com/google-ads/api/docs/concepts/no-developer-token#modify-requests). Most developers should be able
to complete changes to their app in under 30 minutes.

### Will I be charged if I opt in to this pilot?

In general, no, you won't be charged if you opt in to this pilot. The Google Ads API
is offered at no charge, and Google isn't making any changes to the Google Ads API
pricing model.

The possible scenarios for obtaining a Google Cloud organization are as
follows:

1. **You're an existing Google Workspace or Google Cloud Identity customer**:

   You'll be charged as usual for any regular usage of those products. You
   won't be charged for creating a Google Cloud organization for the purpose of
   participating in this pilot.
2. **You created a Google Cloud Identity free edition account**:

   You won't be charged when signing up for Google Cloud Identity free edition
   account or for creating a Google Cloud organization for the purpose of
   participating in this pilot.
3. **Google created a Cloud organization resource for you**:

   This is a Google-managed internal Cloud organization resource so you
   won't be charged as a result.

### I have multiple developer tokens for different tools. How does this pilot affect me?

This use case isn't supported so you won't be able to participate in this
pilot.

### Does this affect any existing API authorization to the accounts I manage using the Google Ads API?

No, this change doesn't affect any existing API authorizations to the Google Ads
accounts you manage using the Google Ads API.

### I opted in to this pilot and have an issue or feedback. How do I contact support?

Contact the Google Ads API team using the [API technical support
page](https://developers.google.com/google-ads/api/support) and explain the nature of your issue. Include
details such as your organization ID and request and response logs when
possible.




Refer to [Feature deprecations](https://developers.google.com/google-ads/api/docs/deprecations#feature-deprecations) for
an up to date list of current and planned feature deprecations.

<br />

## v25 major version

Google Ads API v25 includes the following new features, updates, and breaking changes.

### v25 (2026-07-22)

The following new features, updates, and breaking changes were added in Google Ads API
v25, which is a major release.

See [Upgrade to the latest version](https://developers.google.com/google-ads/api/docs/upgrade) for guidance.

#### Breaking changes

| Initial state | New state | Change type | Implementation guidance |
|---|---|---|---|
| Campaigns ||||
| Standalone fields `additional_value` and `additional_high_lifetime_value` in [`CustomerLifecycleOptimizationValueSettings`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerLifecycleOptimizationValueSettings) | Part of `value_adjustment` and `high_lifetime_value_adjustment` oneofs respectively, alongside the new [`value_multiplier`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerLifecycleOptimizationValueSettings#value_multiplier) and [`high_lifetime_value_multiplier`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerLifecycleOptimizationValueSettings#high_lifetime_value_multiplier) fields | Structural change | Update references to these fields as they are now part of oneofs. |
| Legacy [`CustomerLifecycleGoal`](https://developers.google.com/google-ads/api/reference/rpc/v24/CustomerLifecycleGoal) and [`CampaignLifecycleGoal`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignLifecycleGoal) resources, their corresponding services [`CustomerLifecycleGoalService`](https://developers.google.com/google-ads/api/reference/rpc/v24/CustomerLifecycleGoalService) and [`CampaignLifecycleGoalService`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignLifecycleGoalService), and legacy settings/enums (`CustomerAcquisitionGoalSettings`, `CustomerAcquisitionOptimizationModeEnum`, `LifecycleGoalValueSettings`) | None | Removal | Use the revamped unified goals schema: - Use the [`new_customer_acquisition_goal_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/Goal#new_customer_acquisition_goal_settings) field in the [`Goal`](https://developers.google.com/google-ads/api/reference/rpc/v25/Goal) resource. - Use the [`campaign_new_customer_acquisition_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfig#campaign_new_customer_acquisition_settings) field in the [`CampaignGoalConfig`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfig) resource to configure campaign-specific overrides. |
| General ||||
| Nested enum fields in Incentive Service request and response messages: - `FetchIncentiveRequest.type` - `Incentive.type` - `IncentiveOffer.type` | Standalone enum fields: - [`FetchIncentiveRequest.incentive_type`](https://developers.google.com/google-ads/api/reference/rpc/v25/FetchIncentiveRequest#incentive_type) - [`Incentive.incentive_type`](https://developers.google.com/google-ads/api/reference/rpc/v25/Incentive#incentive_type) - [`IncentiveOffer.offer_type`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveOffer#offer_type) | Rename / removal | Use the new standalone enum fields instead of the legacy `type` fields. |
| Optional [`selected_incentive_id`](https://developers.google.com/google-ads/api/reference/rpc/v25/ApplyIncentiveRequest#selected_incentive_id) and [`customer_id`](https://developers.google.com/google-ads/api/reference/rpc/v25/ApplyIncentiveRequest#customer_id) fields in `ApplyIncentiveRequest` | Required fields | Behavioral shift | Ensure you provide both fields when calling `ApplyIncentive`. |
| The consumer email address field [`ContactDetails.email`](https://developers.google.com/google-ads/api/reference/rpc/v24/ContactDetails#email) in the [`LocalServicesLead`](https://developers.google.com/google-ads/api/reference/rpc/v25/LocalServicesLead) resource | None | Removal | Remove references to this field because it is no longer supported. |
| Optional [`allowed_domain`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdvertisingPartnerLinkInvitationProperties#allowed_domain) field in [`AdvertisingPartnerLinkInvitationProperties`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdvertisingPartnerLinkInvitationProperties) | Required field when calling [`CreateProductLinkInvitation`](https://developers.google.com/google-ads/api/reference/rpc/v25/ProductLinkInvitationService#CreateProductLinkInvitation) for an advertising partner | Behavioral shift | Ensure you provide `allowed_domain` when creating a product link invitation for an advertising partner. |
| Planning ||||
| The `search_brand` field in [`GenerateCreatorInsightsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#search_brand) | None | Removal | Use [`search_topics`](https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateCreatorInsightsRequest#search_topics) instead. |
| The `plannable_location_id` field in [`Targeting`](https://developers.google.com/google-ads/api/reference/rpc/v24/Targeting#plannable_location_id) and `cookie_frequency_cap` field in [`GenerateReachForecastRequest`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateReachForecastRequest#cookie_frequency_cap) | None | Removal | Switch to using [`plannable_location_ids`](https://developers.google.com/google-ads/api/reference/rpc/v25/Targeting#plannable_location_ids) and [`cookie_frequency_cap_setting`](https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateReachForecastRequest#cookie_frequency_cap_setting). |
| Reports ||||
| `customer_metrics` field in [`GenerateBenchmarksMetricsResponse`](https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateBenchmarksMetricsResponse) and [`BreakdownMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v25/BreakdownMetrics) of type `Metrics` | Field of type [`CustomerMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerMetrics) | Type change / behavioral shift | Update your integrations to use the new `CustomerMetrics` type, which only contains metrics representing the customer's ad performance. |

#### Features and updates (non-breaking)

| Features and updates | Type | Description |
|---|---|---|
| Ads |||
| [`AssetAutomationType.GENERATE_ANIMATED_IMAGES_FROM_OTHER_ASSETS`](https://developers.google.com/google-ads/api/reference/rpc/v25/AssetAutomationTypeEnum.AssetAutomationType#generate_animated_images_from_other_assets) | New enum value / behavior | Available for `DemandGenMultiAssetAds`. If enabled, it generates animated images using non-animated images as input. New `DemandGenMultiAssetAds` are opted in by default starting with this API version. |
| Synthetic content info mutability | Behavior change | [`Asset.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v25/Asset#synthetic_content_info) and [`Ad.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v25/Ad#synthetic_content_info) are now fully mutable in v25, v24, and v23. |
| Campaigns |||
| Loyalty Retention Goal | New features / settings | Added support for Loyalty Retention Goal, which allows advertisers to optimize campaigns for retaining loyalty program members. - Added [`LOYALTY_RETENTION`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalTypeEnum.GoalType#loyalty_retention) to the [`GoalType`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalTypeEnum.GoalType) enum. - Added [`CampaignGoalConfig.campaign_loyalty_retention_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfig#campaign_loyalty_retention_settings) to configure campaign-specific loyalty retention settings, including bid adjustments and showing member benefits in PLA format. - Added [`Goal.loyalty_retention_goal_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/Goal#loyalty_retention_goal_settings) to configure account-level loyalty retention goal settings. - Added new error codes: - [`LOYALTY_RETENTION_GOAL_INVALID_MODE`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError#loyalty_retention_goal_invalid_mode) - [`CANNOT_USE_INCOMPATIBLE_CLO_GOALS`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError#cannot_use_incompatible_clo_goals) - [`LOYALTY_RETENTION_GOAL_ALREADY_EXISTS`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalErrorEnum.GoalError#loyalty_retention_goal_already_exists) |
| New Customer Acquisition Goal | New features / settings | Updated New Customer Acquisition Goal support in the Google Ads API to reflect the revamped unified goals schema: - Extended the [`Goal`](https://developers.google.com/google-ads/api/reference/rpc/v25/Goal) resource to support New Customer Acquisition settings using the [`new_customer_acquisition_goal_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/Goal#new_customer_acquisition_goal_settings) field. - Extended the [`CampaignGoalConfig`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfig) resource to support campaign-specific overrides for New Customer Acquisition using the [`campaign_new_customer_acquisition_settings`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfig#campaign_new_customer_acquisition_settings) field. - Added the new [`CustomerLifecycleOptimizationGoalSubType`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerLifecycleOptimizationGoalSubTypeEnum.CustomerLifecycleOptimizationGoalSubType) enum to define supported goal subtypes. - Added [`NEW_CUSTOMER_ACQUISITION`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalTypeEnum.GoalType#new_customer_acquisition) to the [`GoalType`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalTypeEnum.GoalType) enum. - Added new validation error reasons to [`GoalError`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalErrorEnum.GoalError): - [`NEW_CUSTOMER_ACQUISITION_GOAL_ALREADY_EXISTS`](https://developers.google.com/google-ads/api/reference/rpc/v25/GoalErrorEnum.GoalError#new_customer_acquisition_goal_already_exists) - Added new validation error reasons to [`CampaignGoalConfigError`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError): - [`CAMPAIGN_OVERRIDE_VALUES_SET_FOR_NEW_CUSTOMER_ACQUISITION_TARGET_SPECIFIC_OPTION`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError#campaign_override_values_set_for_new_customer_acquisition_target_specific_option) - [`CAMPAIGN_OVERRIDE_HIGH_LIFETIME_VALUE_NOT_SUPPORTED_FOR_CAMPAIGN_TYPE`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError#campaign_override_high_lifetime_value_not_supported_for_campaign_type) - [`CANNOT_USE_INCOMPATIBLE_CLO_GOALS`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignGoalConfigErrorEnum.CampaignGoalConfigError#CANNOT_USE_INCOMPATIBLE_CLO_GOALS) - Added [`ErrorDetails.incompatible_clo_goal_error_details`](https://developers.google.com/google-ads/api/reference/rpc/v25/ErrorDetails#incompatible_clo_goal_error_details) to expose the new [`IncompatibleCloGoalsErrorDetails`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncompatibleCloGoalsErrorDetails) structure for validation errors. |
| Conversions |||
| YouTube third-party conversion attribution | New fields | Added support for YouTube conversion attribution verification using third-party partners: - Added [`CustomerThirdPartyIntegrationPartners.conversion_attribution_integration_partners`](https://developers.google.com/google-ads/api/reference/rpc/v25/CustomerThirdPartyIntegrationPartners#conversion_attribution_integration_partners) to allow configuring integration partners at the customer level. - Added [`CampaignThirdPartyIntegrationPartners.conversion_attribution_integration_partners`](https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignThirdPartyIntegrationPartners#conversion_attribution_integration_partners) to allow configuring integration partners at the campaign level. See the [Help Center article](https://support.google.com/google-ads/answer/7382633) to learn more. |
| General |||
| [`ContactDetails.phone_number_extension`](https://developers.google.com/google-ads/api/reference/rpc/v25/ContactDetails#phone_number_extension) | New field | Added to the [`LocalServicesLead`](https://developers.google.com/google-ads/api/reference/rpc/v25/LocalServicesLead) resource. |
| [`IncentiveError`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError) | New enum values / errors | Added new specific error codes for incentive redemption failures: - [`BILLING_COUNTRY_NOT_ELIGIBLE`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#billing_country_not_eligible) (the customer's billing country is not eligible for the incentive) - [`USER_IS_MCC_MANAGER`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#user_is_mcc_manager) (the user is a manager account and cannot redeem the incentive) - [`USER_SUSPENDED`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#user_suspended) (the customer account is suspended) - [`MAX_PENDING_INCENTIVES`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#max_pending_incentives) (the customer has reached the maximum number of pending incentives) - [`ACCOUNT_HAD_RECENT_SPEND`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#account_had_recent_spend) (the account had recent spend and is not eligible) - [`MAX_INCENTIVES_REDEEMED_FROM_OFFER`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#max_incentives_redeemed_from_offer) (the customer has already redeemed the maximum number of incentives from this offer) - [`MISMATCHING_BILLING_COUNTRY_CODE`](https://developers.google.com/google-ads/api/reference/rpc/v25/IncentiveErrorEnum.IncentiveError#mismatching_billing_country_code) (the billing country code provided in the request does not match the customer's account country) |
| Planning |||
| YouTube channel details in trending insights | New fields | Added support for more YouTube channel details of related videos when searching trending insights. The new fields [`channel_id`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeVideoAttributeMetadata#channel_id), [`channel_name`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeVideoAttributeMetadata#channel_name), and [`channel_url`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeVideoAttributeMetadata#channel_url) have been added to [`YouTubeVideoAttributeMetadata`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeVideoAttributeMetadata). |
| [`YouTubeChannelInsights.data_sharing_consent_given`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeChannelInsights#data_sharing_consent_given) | New field | Added to [`YouTubeChannelInsights`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeChannelInsights). This is true if a creator has consented to sharing non-public data. If so, the following fields are populated: - [`average_views_per_video`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeMetrics#average_views_per_video) - [`average_likes_per_video`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeMetrics#average_likes_per_video) - [`average_comments_per_video`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeMetrics#average_comments_per_video) - [`engagement_rate`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeMetrics#engagement_rate) - [`channel_audience_attributes`](https://developers.google.com/google-ads/api/reference/rpc/v25/YouTubeChannelInsights#channel_audience_attributes) |
| Reports |||
| [`ad_sub_format_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_sub_format_type) | New segment | Provides a breakdown of YouTube instream non-skippable ads by duration: - [`INSTREAM_NON_SKIPPABLE_STANDARD`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdSubFormatTypeEnum.AdSubFormatType#instream_non_skippable_standard) (standard duration instream non-skippable ad) - [`INSTREAM_NON_SKIPPABLE_MAX30_SEC`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdSubFormatTypeEnum.AdSubFormatType#instream_non_skippable_max30_sec) (instream non-skippable ad no longer than 30.99 seconds) - [`INSTREAM_NON_SKIPPABLE_MAX60_SEC`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdSubFormatTypeEnum.AdSubFormatType#instream_non_skippable_max60_sec) (instream non-skippable ad no longer than 60.99 seconds) This segment must always be selected together with [`ad_format_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_format_type). It is selectable with [`AdGroup`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup), [`AdGroupAd`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupAd), [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign), [`Customer`](https://developers.google.com/google-ads/api/reference/rpc/v25/Customer), [`Video`](https://developers.google.com/google-ads/api/reference/rpc/v25/Video), and [`VideoEnhancement`](https://developers.google.com/google-ads/api/reference/rpc/v25/VideoEnhancement). |
| Video-specific social metrics | New fields / metrics | Added video-specific social metrics to help advertisers track user engagement (comments, likes, and shares) for Shorts ads on YouTube: - [`Metrics.youtube_comments`](https://developers.google.com/google-ads/api/reference/rpc/v25/Metrics#youtube_comments) - [`Metrics.youtube_likes`](https://developers.google.com/google-ads/api/reference/rpc/v25/Metrics#youtube_likes) - [`Metrics.youtube_shares`](https://developers.google.com/google-ads/api/reference/rpc/v25/Metrics#youtube_shares) They are available in [`AdGroup`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup), [`AdGroupAd`](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroupAd), [`Asset`](https://developers.google.com/google-ads/api/reference/rpc/v25/Asset), [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign), [`Customer`](https://developers.google.com/google-ads/api/reference/rpc/v25/Customer), and [`Video`](https://developers.google.com/google-ads/api/reference/rpc/v25/Video). |

<br />

## v24 major and minor versions

Google Ads API v24 includes the following new features, updates, and breaking changes.

### v24.2 (2026-06-24)

The following new features and updates were added in Google Ads API v24.2. Minor
versions like v24.2 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Ads |||
| [`AssetAutomationType.GENERATE_LANDING_PAGE_TEXT`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetAutomationTypeEnum.AssetAutomationType#generate_landing_page_text) | New enum value | Generates text information from the landing page to be shown in the engagement panel for [`DemandGenVideoResponsiveAd`](https://developers.google.com/google-ads/api/reference/rpc/v24/DemandGenVideoResponsiveAdInfo) instances (which are opted in by default starting with this API version). |
| Assets |||
| [`AssetGroup.google_local_services_info`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroup#google_local_services_info) | New field | Added to support Local Services Ads information (category ID and callouts) in Performance Max campaigns. |
| [`AssetGroupSignal.local_services_id`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupSignal#local_services_id) | New field | Added to support Local Services Ads service ID signals in Performance Max campaigns. |
| [`AssetGroupSignal.vertical_ads_item_group_rule_list`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupSignal#vertical_ads_item_group_rule_list) | New field | Added to support vertical ads item group rules for selecting items from attached vertical feeds in Performance Max campaigns. This feature is only available to accounts on the allowlist. |
| [`AssetGroupErrorEnum.CANNOT_REMOVE_ALL_ASSET_GROUPS_FROM_CAMPAIGN`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupErrorEnum.AssetGroupError#cannot_remove_all_asset_groups_from_campaign) | New enum value / error | Returned when attempting to remove all asset groups from a campaign. |
| [`AssetGroupSignalErrorEnum.CANNOT_REMOVE_ALL_SIGNALS`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupSignalErrorEnum.AssetGroupSignalError#cannot_remove_all_signals) | New enum value / error | Returned when attempting to remove all signals from an asset group. |
| Campaigns |||
| [`Campaign.PmaxCampaignSettings.local_services_pmax_campaign_settings`](https://developers.google.com/google-ads/api/reference/rpc/v24/Campaign.PmaxCampaignSettings#local_services_pmax_campaign_settings) [`Campaign.PmaxCampaignSettings.local_services_enabled`](https://developers.google.com/google-ads/api/reference/rpc/v24/Campaign.PmaxCampaignSettings#local_services_enabled) | New fields | Support identifying Local Services Performance Max campaigns. |
| [`AdGroup.DemandGenAdGroupSettings.DemandGenChannelControls.DemandGenSelectedChannels.maps`](https://developers.google.com/google-ads/api/reference/rpc/v24/AdGroup.DemandGenAdGroupSettings.DemandGenChannelControls.DemandGenSelectedChannels#maps) | New field | Includes Google Maps in the selectable channels for Demand Gen ad groups. |
| [`CampaignCriterionErrorEnum.CANNOT_REMOVE_ALL_LOCATIONS_FROM_LOCAL_SERVICES_PMAX_CAMPAIGN`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignCriterionErrorEnum.CampaignCriterionError#cannot_remove_all_locations_from_local_services_pmax_campaign) | New enum value / error | Returned when attempting to remove all locations from a local services Performance Max campaign. |
| [`SmartCampaignErrorEnum.CREATION_FAILED`](https://developers.google.com/google-ads/api/reference/rpc/v24/SmartCampaignErrorEnum.SmartCampaignError#creation_failed) | New enum value / error | Returned when attempting to create new Smart Campaigns. |
| Conversions |||
| [`ConversionOrigin.LOCAL_SERVICES_ADS`](https://developers.google.com/google-ads/api/reference/rpc/v24/ConversionOriginEnum.ConversionOrigin#local_services_ads) [`ConversionActionType.LOCAL_SERVICES_ADS`](https://developers.google.com/google-ads/api/reference/rpc/v24/ConversionActionTypeEnum.ConversionActionType#local_services_ads) | New enum values | Represent conversions that occur when a user clicks on a local services ad and calls, messages, or books the advertiser. |
| Experiments |||
| [`COMPARE_CAMPAIGNS`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#compare_campaigns) [`PMAX_TEXT_CUSTOMIZATION_FINAL_URL_EXPANSION`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#pmax_text_customization_final_url_expansion) | New enum values | Added support for new [`ExperimentType`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType) types: - `COMPARE_CAMPAIGNS`: For campaign mix experiments and custom Performance Max experiments that compare multiple campaigns of the same or different types in a single experiment. - `PMAX_TEXT_CUSTOMIZATION_FINAL_URL_EXPANSION`: For Performance Max optimization experiments for text customization and Final URL expansion. |
| General |||
| [`Asset.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v24/Asset#synthetic_content_info) [`Ad.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v24/Ad#synthetic_content_info) | New fields | Contain attestations for synthetic/AI-generated content, split into [`advertiser_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v24/SyntheticContentInfo#advertiser_attestation) (declarations provided directly by the advertiser) and [`system_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v24/SyntheticContentInfo#system_attestation) (attestations automatically detected or provided by the system). This feature has been backported to v23 and v22. To help you plan your upcoming integration work for v25, the interface for mutating advertiser attestation fields is being introduced early for v22 and higher. The interface is visible in these versions, but `synthetic_content_info.advertiser_attestation.status` and `synthetic_content_info.advertiser_attestation.source` will remain immutable for these versions. If you attempt a mutate request on either of these fields, one of these errors will be returned: "The field attempted to be mutated is immutable" or "Field cannot be set". These fields will become fully mutable starting in v25. We recommend using the interface now to build and test your internal logic so your system is ready for full write capabilities when v25 is launched. |
| Multi-Party Authorization | New features | > [!WARNING] > **Beta:** This feature is currently in beta and is subject to change in future releases. Added support for Multi-Party Authorization (MPA) reviews: - Added the [`MultiPartyAuthReview`](https://developers.google.com/google-ads/api/reference/rpc/v24/MultiPartyAuthReview) resource and corresponding [`MultiPartyAuthReviewService`](https://developers.google.com/google-ads/api/reference/rpc/v24/MultiPartyAuthReviewService). - Added the [`MultiPartyAuthReviewStatus`](https://developers.google.com/google-ads/api/reference/rpc/v24/MultiPartyAuthReviewStatusEnum.MultiPartyAuthReviewStatus) enum to track the review status. - Added [`CustomerUserAccess.pending_multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v24/CustomerUserAccess#pending_multi_party_auth_review) to link to a pending review. - Added [`MutateCustomerUserAccessResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v24/MutateCustomerUserAccessResult#multi_party_auth_review) and [`MutateCustomerUserAccessInvitationResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v24/MutateCustomerUserAccessInvitationResult#multi_party_auth_review) to return the associated review resource name. - Added [`MultiPartyAuthReviewError`](https://developers.google.com/google-ads/api/reference/rpc/v24/MultiPartyAuthReviewErrorEnum.MultiPartyAuthReviewError) for validation errors. <br /> This feature has been backported to [v23.3](https://developers.google.com/google-ads/api/docs/release-notes#v23-3-2026-06-24), [v22.2](https://developers.google.com/google-ads/api/docs/release-notes#v22-2-2026-06-24), and [v21.2](https://developers.google.com/google-ads/api/docs/release-notes#v21-2-2026-06-24). |
| [`IncentiveService.FetchIncentive`](https://developers.google.com/google-ads/api/reference/rpc/v24/IncentiveService#FetchIncentive) | Behavioral change | When an invalid email address is provided in the request, the method now gracefully falls back to returning the default incentive offers instead of throwing an `AuthenticationError.INVALID_EMAIL_ADDRESS` error. |
| Planning |||
| [`GenerateCreatorInsightsRequest.search_topics`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#search_topics) | New field | Added to the [`ContentCreatorInsightsService.GenerateCreatorInsights`](https://developers.google.com/google-ads/api/reference/rpc/v24/ContentCreatorInsightsService#GenerateCreatorInsights) service. This option searches for creators talking about a topic in the country specified in [`country_locations`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#country_locations[]) (supports searching for one country only). |
| [`CREATOR_TOPIC_INSIGHTS`](https://developers.google.com/google-ads/api/reference/rpc/v24/InsightsKnowledgeGraphEntityCapabilitiesEnum.InsightsKnowledgeGraphEntityCapabilities#creator_topic_insights) | New enum value | Added to [`InsightsKnowledgeGraphEntityCapabilities`](https://developers.google.com/google-ads/api/reference/rpc/v24/InsightsKnowledgeGraphEntityCapabilitiesEnum.InsightsKnowledgeGraphEntityCapabilities) to signify entities for searching creators talking about a topic. These entities should be used in the [`search_topics`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#search_topics) field. Retrieved using [`AudienceInsightsService.ListAudienceInsightsAttributes`](https://developers.google.com/google-ads/api/reference/rpc/v24/AudienceInsightsService#ListAudienceInsightsAttributes). |
| [`KnowledgeGraphEntitySearchOptions`](https://developers.google.com/google-ads/api/reference/rpc/v24/KnowledgeGraphEntitySearchOptions) | New type / options | Contains additional search options for topics in [`ListAudienceInsightsAttributes`](https://developers.google.com/google-ads/api/reference/rpc/v24/AudienceInsightsService#ListAudienceInsightsAttributes), including options to retrieve all topics supported as creator attributes, and filtering by capabilities. |
| [`GenerateCreatorInsightsRequest.supplemental_data`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#supplemental_data[]) [`GenerateTrendingInsightsRequest.supplemental_data`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateTrendingInsightsRequest#supplemental_data[]) | New fields | Optional inputs to the `ContentCreatorInsightsService` methods. Supplying this field populates additional locations or creator attributes in the response. |
| [`local_creator_insights`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsResponse#local_creator_insights[]) [`related_local_creators`](https://developers.google.com/google-ads/api/reference/rpc/v24/TrendInsight#related_local_creators[]) | New fields | Populated when [`supplemental_data`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateCreatorInsightsRequest#supplemental_data[]) contains the [`LOCAL_CREATOR_DATA`](https://developers.google.com/google-ads/api/reference/rpc/v24/ContentCreatorInsightsSupplementalDataEnum.ContentCreatorInsightsSupplementalData#LOCAL_CREATOR_DATA) enum. Exposes local creators viewed in or based in the chosen country who consented to share location data. |
| [`GenerateTrendingInsightsRequest.sub_country_locations`](https://developers.google.com/google-ads/api/reference/rpc/v24/GenerateTrendingInsightsRequest#sub_country_locations[]) | New field | Added to [`ContentCreatorInsightsService.GenerateTrendingInsights`](https://developers.google.com/google-ads/api/reference/rpc/v24/ContentCreatorInsightsService#GenerateTrendingInsights), allowing searches for trending insights using country location and sub country locations. |
| Reports |||
| [`PerformanceMaxPlacementView`](https://developers.google.com/google-ads/api/reference/rpc/v24/PerformanceMaxPlacementView) | Segments extension | Made segmentable by [`ad_network_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_network_type). |
| Shopping |||
| [`Campaign.ShoppingSetting.ignore_brand_exclusion_in_shopping_ads`](https://developers.google.com/google-ads/api/reference/rpc/v24/Campaign.ShoppingSetting#ignore_brand_exclusion_in_shopping_ads) | New field | If true, brand exclusions are ignored for Shopping ads. Only supported for Shopping campaigns. |
| Targeting |||
| [`CriterionErrorEnum.CANNOT_TARGET_LANGUAGE`](https://developers.google.com/google-ads/api/reference/rpc/v24/CriterionErrorEnum.CriterionError#cannot_target_language) | New enum value / error | Returned when attempting to target a language that is not allowed. |
| Videos |||
| [`DataLink.youtube_link_metadata`](https://developers.google.com/google-ads/api/reference/rpc/v24/DataLink#youtube_link_metadata) | New field | Contains [`brand_channel_id`](https://developers.google.com/google-ads/api/reference/rpc/v24/YoutubeLinkMetadata#brand_channel_id) to specify the ID of the linked YouTube brand channel. |

### v24.1 (2026-05-13)

The following new features and updates were added in Google Ads API v24.1. Minor
versions like v24.1 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Ads |||
| [`DemandGenMultiAssetAdInfo.classic_display_images`](https://developers.google.com/google-ads/api/reference/rpc/v24/DemandGenMultiAssetAdInfo#classic_display_images[]) | New field | Custom uploaded display images served without requiring extra responsive assets. |
| Experiments |||
| [`ADOPT_AI_MAX`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#adopt_ai_max) [`ADOPT_BROAD_MATCH_KEYWORDS`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#adopt_broad_match_keywords) [`OPTIMIZE_ASSETS`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#optimize_assets) [`PMAX_REPLACEMENT_SHOPPING`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#pmax_replacement_shopping) | New enum values | Added support for new [`ExperimentType`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType) types: - `ADOPT_AI_MAX`: For experiments that test how AI Max can help you engage more customers with Google AI and broad match keywords. - `ADOPT_BROAD_MATCH_KEYWORDS`: For experiments that test how broad match keywords can impact the number of searches your ads appear in. - `OPTIMIZE_ASSETS`: For custom experiments for optimizing assets. - `PMAX_REPLACEMENT_SHOPPING`: For experiments that test how your Shopping campaigns perform compared to Performance Max. |
| [`Experiment.video_experiment`](https://developers.google.com/google-ads/api/reference/rpc/v24/Experiment#video_experiment) | New field | Configuration support for existing [`YOUTUBE_CUSTOM`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentTypeEnum.ExperimentType#youtube_custom) experiments consisting of Video campaigns. |
| [`ExperimentArm.asset_testing_info`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentArm#asset_testing_info) [`ExperimentArm.asset_groups`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentArm#asset_groups[]) [`ExperimentArm.performance_max_experiment_arm_info`](https://developers.google.com/google-ads/api/reference/rpc/v24/ExperimentArm#performance_max_experiment_arm_info) | New fields | Exposes fields to support asset testing, asset groups, and Performance Max settings in experiment arms: - `asset_testing_info`: Details of assets associated with the experimental copies of ads. - `asset_groups`: List of asset groups in the experiment arm for Optimize Assets experiments. - `performance_max_experiment_arm_info`: Settings for Performance Max campaigns in `PMAX_REPLACEMENT_SHOPPING` experiments. |
| General |||
| [`CustomerUserAccess.passkey_enabled`](https://developers.google.com/google-ads/api/reference/rpc/v24/CustomerUserAccess#passkey_enabled) | New field | Read-only field indicating whether the user has a passkey enabled. |
| Reports |||
| [`mobile_device_platform`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.mobile_device_platform) | New segment | Allows segmenting reports by the user device's platform (such as iOS or Android). |
| [`REQUESTED_DATE_GRANULARITY_NOT_SUPPORTED`](https://developers.google.com/google-ads/api/reference/rpc/v24/DateRangeErrorEnum.DateRangeError#requested_date_granularity_not_supported) | New enum value / error | Returned when the requested daily, hourly, or weekly time granularity is not supported for query date ranges (only available for the last 37 months). |
| [`vertical_ads_listing_user_rating`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.vertical_ads_listing_user_rating) [`vertical_ads_listing_venue`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.vertical_ads_listing_venue) | New segments | New segments to be used for vertical ads. |
| `user_rating`, `venue`, `event_participant_display_name` | New filter criteria | Supported filtering in [`VerticalAdsItemGroupRuleInfo`](https://developers.google.com/google-ads/api/reference/rpc/v24/VerticalAdsItemGroupRuleInfo) for the [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v24/SharedCriterion) resource. |
| Control/treatment experiment metrics | New fields | Added control values (`control_clicks`, etc.), treatment values (`clicks`, etc.), point estimates (`clicks_point_estimate`, etc.), margins of error (`clicks_margin_of_error`, etc.), and p-values (`clicks_p_value`, etc.) across seven core metric families (Clicks, Impressions, Cost, Conversions, Cost per conversion, Conversion value, Conversion value per cost). |
| Conversions absolute change metrics | New fields | Support for [`Conversions` absolute difference estimations](https://developers.google.com/google-ads/api/reference/rpc/v24/Metrics) using point estimate, margin of error, and p-value fields. |
| Targeting |||
| [`CriterionErrorEnum.CANNOT_EXCLUDE_ALL_TARGETS`](https://developers.google.com/google-ads/api/reference/rpc/v24/CriterionErrorEnum.CriterionError#cannot_exclude_all_targets) | New enum value / error | Returned when attempting to exclude all demographics targets. |
| Videos |||
| [`ThirdPartyViewabilityIntegrationPartnerEnum.ZEFR`](https://developers.google.com/google-ads/api/reference/rpc/v24/ThirdPartyViewabilityIntegrationPartnerEnum.ThirdPartyViewabilityIntegrationPartner#zefr) | New enum value | Published ZEFR as a third party viewability integration partner. |
| [`DataLink.youtube_video.channel_id`](https://developers.google.com/google-ads/api/reference/rpc/v24/DataLink#youtube_video) | New field | Exposes the YouTube channel ID associated with the data link. |

### v24 (2026-04-22)

The following new features, updates, and breaking changes were added in Google Ads API
v24, which is a major release.

See [Upgrade to the latest version](https://developers.google.com/google-ads/api/docs/upgrade) for guidance.

#### Breaking changes

| Initial state | New state | Change type | Implementation guidance |
|---|---|---|---|
| Ads ||||
| Optional [`videos`](https://developers.google.com/google-ads/api/reference/rpc/v24/DemandGenVideoResponsiveAdInfo#videos[]) and [`logo_images`](https://developers.google.com/google-ads/api/reference/rpc/v24/DemandGenVideoResponsiveAdInfo#logo_images[]) in [`DemandGenVideoResponsiveAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v24/DemandGenVideoResponsiveAdInfo) | Required fields | Behavioral shift | Provide `videos` and `logo_images` when creating or mutating responsive Demand Gen video ads. |
| Optional [`videos`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo#videos[]), [`business_name`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo#business_name), and [`logo_images`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo#logo_images[]) in [`VideoResponsiveAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo) | Required fields | Behavioral shift | Provide `videos`, `business_name`, and `logo_images` when creating or mutating video responsive ads. Note that [`VideoResponsiveAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo) is now mutable. |
| Campaigns ||||
| [`Campaign.video_brand_safety_suitability`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign#video_brand_safety_suitability) | None | Removal | Campaign-level suitability control is removed. Brand safety suitability is still available on the customer level. Use [`Customer.video_brand_safety_suitability`](https://developers.google.com/google-ads/api/reference/rpc/v24/Customer#video_brand_safety_suitability) instead. |
| Conversions ||||
| `UserListCustomerTypeCategoryEnum.LOYALTY_SIGN_UPS` | None | Removal | The loyalty sign ups user category has been removed. Remove code references to it. |
| Planning ||||
| [`InsightsAudienceAttributeGroup`](https://developers.google.com/google-ads/api/reference/rpc/v24/InsightsAudienceAttributeGroup) type for [`topic_audience_combinations`](https://developers.google.com/google-ads/api/reference/rpc/v24/InsightsAudience#topic_audience_combinations[]) | `common.https://developers.google.com/google-ads/api/reference/rpc/v24/InsightsAudienceAttributeGroup` type | Behavioral shift / type change | Typed client libraries integrations must be updated to use the new resource namespaces. |
| `youtube_select_lineups` field in [`ReachPlanService.ListPlannableProducts`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#ListPlannableProducts) | None | Removal | Switch to using lineups from [`youtube_select_lineup_targeting`](https://developers.google.com/google-ads/api/reference/rpc/v24/PlannableTargeting#youtube_select_lineup_targeting). |
| `is_brand_connect_creator` field in [`ContentCreatorInsightsService.GenerateCreatorInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#GenerateCreatorInsights) and [`GenerateTrendingInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#GenerateTrendingInsights) | None | Removal | Instead, check if a creator has [`CREATOR_PARTNERSHIPS`](https://developers.google.com/google-ads/api/reference/rpc/v24/PartnershipOpportunityEnum.PartnershipOpportunity#creator_partnerships) available in [`partnership_opportunities`](https://developers.google.com/google-ads/api/reference/rpc/v24/YouTubeMetrics#partnership_opportunities[]). |
| `geo_modifiers` and `biddable_keywords` in [`KeywordPlanIdeaService.GenerateKeywordForecastMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v23/KeywordPlanIdeaService#generateKeywordForecastMetrics) | `geo_target_constants` and `keywords` | Rename / removal | Replaced by [`CampaignToForecast.geo_target_constants[]`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignToForecast#geo_target_constants[]) and [`ForecastAdGroup.keywords[]`](https://developers.google.com/google-ads/api/reference/rpc/v24/ForecastAdGroup#keywords[]). |
| Deprecated keywords plan / forecast fields in [`GenerateKeywordForecastMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v23/KeywordPlanIdeaService#generateKeywordForecastMetrics) | None | Removal | Removed the following plan / forecast fields and types: - [`CampaignToForecast.keyword_plan_network`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignToForecast#keyword_plan_network) - [`CampaignToForecast.negative_keywords`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignToForecast#negative_keywords[]) and [`ForecastAdGroup.negative_keywords`](https://developers.google.com/google-ads/api/reference/rpc/v23/ForecastAdGroup#negative_keywords[]) - [`ForecastAdGroup.max_cpc_bid_micros`](https://developers.google.com/google-ads/api/reference/rpc/v23/ForecastAdGroup#max_cpc_bid_micros) - [`BiddableKeyword`](https://developers.google.com/google-ads/api/reference/rpc/v23/BiddableKeyword) - [`CriterionBidModifier`](https://developers.google.com/google-ads/api/reference/rpc/v23/CriterionBidModifier) - [`KeywordForecastMetrics.impressions`](https://developers.google.com/google-ads/api/reference/rpc/v23/KeywordForecastMetrics#impressions) - [`KeywordForecastMetrics.click_through_rate`](https://developers.google.com/google-ads/api/reference/rpc/v23/KeywordForecastMetrics#click_through_rate) Update integrations accordingly. |
| Reports ||||
| [`ad_sub_network_type`](https://developers.google.com/google-ads/api/reference/rpc/v23/Segments#ad_sub_network_type) segment in [`campaign_budget`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignBudget) | None | Removal | Removed `ad_sub_network_type` segment for the [`campaign_budget`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignBudget) resource. |
| [`click_type`](https://developers.google.com/google-ads/api/reference/rpc/v23/Segments#click_type) segment in asset views | None | Removal | Removed segment from [`AdGroupAsset`](https://developers.google.com/google-ads/api/reference/rpc/v24/AdGroupAsset), [`CampaignAsset`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignAsset), and [`CustomerAsset`](https://developers.google.com/google-ads/api/reference/rpc/v24/CustomerAsset) views. |
| Videos ||||
| Partial failure allowed in [`ShareablePreviewService.GenerateShareablePreviews`](https://developers.google.com/google-ads/api/reference/rpc/v24/ShareablePreviewService#GenerateShareablePreviews) | No partial failure | Behavioral shift | Requests will fail and throw an error if any ID within it fails validation. |
| [`ShareablePreviewError`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreviewErrorEnum.ShareablePreviewError) legacy codes: - [`ASSET_GROUP_DOES_NOT_EXIST_UNDER_THIS_CUSTOMER`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreviewErrorEnum.ShareablePreviewError#asset_group_does_not_exist_under_this_customer) - [`TOO_MANY_ASSET_GROUPS_IN_REQUEST`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreviewErrorEnum.ShareablePreviewError#too_many_asset_groups_in_request) | [`MutateErrorEnum.RESOURCE_NOT_FOUND`](https://developers.google.com/google-ads/api/reference/rpc/v24/MutateErrorEnum.MutateError#resource_not_found) [`ShareablePreviewError.TOO_MANY_RESOURCES_IN_REQUEST`](https://developers.google.com/google-ads/api/reference/rpc/v24/ShareablePreviewErrorEnum.ShareablePreviewError#too_many_resources_in_request) | Rename / behavioral shift | Error codes returned for asset groups are modified to align with ad group ad errors. Update validation catch logic. |

#### Features and updates (non-breaking)

| Features and updates | Type | Description |
|---|---|---|
| Ads |||
| Mutability of [`VideoResponsiveAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v24/VideoResponsiveAdInfo) | Behavioral change | Responsive video ads information objects are now mutable. |
| Assets |||
| [`travel_feed_data`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetSet#travel_feed_data) in `AssetSet` | New field | Added to retrieve travel feed assets attributes (`hotel_center_account_id`, `merchant_center_id`, `partner_center_id`, `subset_id`, `travel_feed_vertical_type`). |
| Campaigns |||
| [`Campaign.view_through_conversion_optimization_enabled`](https://developers.google.com/google-ads/api/reference/rpc/v24/Campaign#view_through_conversion_optimization_enabled) | New field | Allows enabling View-Through Conversion (VTC) Optimization (default `false`) in Demand Gen and App campaigns. |
| [`CampaignCriterion.gender`](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignCriterion#gender) | New feature | Enabled gender exclusions for Performance Max campaigns on all Google Ads API versions. |
| Conversions |||
| Lead Gen conversion types | New enum values | Added new GA4/Firebase conversion action type enums in [`ConversionActionType`](https://developers.google.com/google-ads/api/reference/rpc/v24/ConversionActionTypeEnum.ConversionActionType): - `GOOGLE_ANALYTICS_4_GENERATE_LEAD` - `GOOGLE_ANALYTICS_4_QUALIFY_LEAD` - `GOOGLE_ANALYTICS_4_CLOSE_CONVERT_LEAD` - `FIREBASE_ANDROID_GENERATE_LEAD` - `FIREBASE_ANDROID_QUALIFY_LEAD` - `FIREBASE_ANDROID_CLOSE_CONVERT_LEAD` - `FIREBASE_IOS_GENERATE_LEAD` - `FIREBASE_IOS_QUALIFY_LEAD` - `FIREBASE_IOS_CLOSE_CONVERT_LEAD` |
| General |||
| [`UserListErrorEnum.DUPLICATE_LOOKALIKE`](https://developers.google.com/google-ads/api/reference/rpc/v24/UserListErrorEnum.UserListError#duplicate_lookalike) | New enum value / error | Returned when attempting to create multiple identical lookalike lists. |
| Planning |||
| `ProductCoreAttributes` fields in `ListPlannableProductsResponse` | New fields | Added plannable product description, marketing objective, cost model, and buying method to [`ProductCoreAttributes`](https://developers.google.com/google-ads/api/reference/rpc/v24/ProductCoreAttributes) under [`ListPlannableProductsResponse`](https://developers.google.com/google-ads/api/reference/rpc/v24/ListPlannableProductsResponse). |
| Reports |||
| [`CartDataSalesView`](https://developers.google.com/google-ads/api/reference/rpc/v24/CartDataSalesView) | New reporting resource | Exposes reports segmenting conversions metrics by the specific product sold (brand, etc.) in addition to the clicked product. |
| Non-biddable metrics | New fields | Added non-biddable metrics (metrics showing conversions that campaigns are not optimizing for) to all matching resources: - [`all_average_cart_size`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_average_cart_size) - [`all_average_order_value_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_average_order_value_micros) - [`all_cost_of_goods_sold_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_cost_of_goods_sold_micros) - [`all_cross_sell_cost_of_goods_sold_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_cross_sell_cost_of_goods_sold_micros) - [`all_cross_sell_gross_profit_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_cross_sell_gross_profit_micros) - [`all_cross_sell_revenue_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_cross_sell_revenue_micros) - [`all_cross_sell_units_sold`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_cross_sell_units_sold) - [`all_gross_profit_margin`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_gross_profit_margin) - [`all_gross_profit_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_gross_profit_micros) - [`all_lead_cost_of_goods_sold_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_lead_cost_of_goods_sold_micros) - [`all_lead_gross_profit_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_lead_gross_profit_micros) - [`all_lead_revenue_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_lead_revenue_micros) - [`all_lead_units_sold`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_lead_units_sold) - [`all_orders`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_orders) - [`all_revenue_micros`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_revenue_micros) - [`all_units_sold`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.all_units_sold) |
| [`conversion_attribution_event_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.conversion_attribution_event_type) | New segment | Added to [`ShoppingPerformanceView`](https://developers.google.com/google-ads/api/reference/rpc/v24/ShoppingPerformanceView). |
| Shopping |||
| App campaigns in `ShoppingProduct` | New feature | Supported App campaigns inside the [`ShoppingProduct`](https://developers.google.com/google-ads/api/reference/rpc/v24/ShoppingProduct) resource. Note status and issues are not supported. |
| Tag-based product filtering | New feature | Introduced filtering using logical set expressions dynamically: - Added [`RETAIL_FILTER_BUNDLE`](https://developers.google.com/google-ads/api/reference/rpc/v24/CriterionTypeEnum.CriterionType#retail_filter_bundle) and [`RETAIL_FILTER`](https://developers.google.com/google-ads/api/reference/rpc/v24/CriterionTypeEnum.CriterionType#retail_filter) criterion types. - Added [`RETAIL_FILTER`](https://developers.google.com/google-ads/api/reference/rpc/v24/SharedSetTypeEnum.SharedSetType#retail_filter) shared set type. - Added the `retail_filter_bundle` field to [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v24/AdGroupCriterion). - Added the `retail_filter` field to [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v24/SharedCriterion). - Added `RETAIL` to [`ListingGroupFilterListingSource`](https://developers.google.com/google-ads/api/reference/rpc/v24/ListingGroupFilterListingSourceEnum.ListingGroupFilterListingSource). - Added `RetailFilter` dimension to [`AssetGroupListingGroupFilter`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupListingGroupFilter). - Added related new validation errors in [`CriterionError`](https://developers.google.com/google-ads/api/reference/rpc/v24/CriterionErrorEnum.CriterionError) and [`AssetGroupListingGroupFilterError`](https://developers.google.com/google-ads/api/reference/rpc/v24/AssetGroupListingGroupFilterErrorEnum.AssetGroupListingGroupFilterError). This feature is only available to accounts on the allowlist. |

<br />

## v23 major and minor versions

Google Ads API v23 includes the following new features, updates, and breaking changes.

### v23.3 (2026-06-24)

The following new features and updates were added in Google Ads API v23.3. Minor
versions like v23.3 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| General |||
| [`Asset.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v23/Asset#synthetic_content_info) [`Ad.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v23/Ad#synthetic_content_info) | New fields | Contain attestations for synthetic/AI-generated content, split into [`advertiser_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v23/SyntheticContentInfo#advertiser_attestation) (declarations provided directly by the advertiser) and [`system_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v23/SyntheticContentInfo#system_attestation) (attestations automatically detected or provided by Google's systems). To help you plan your upcoming integration work for v25, the interface for mutating advertiser attestation fields is being introduced early for v22 and higher. The interface is visible in these versions, but `synthetic_content_info.advertiser_attestation.status` and `synthetic_content_info.advertiser_attestation.source` will remain immutable for these versions. If you attempt a mutate request on either of these fields, one of these errors will be returned: "The field attempted to be mutated is immutable" or "Field cannot be set". These fields will become fully mutable starting in v25. We recommend using the interface now to build and test your internal logic so your system is ready for full write capabilities when v25 is launched. |
| Multi-party approvals | New features | > [!WARNING] > **Beta:** This feature is currently in beta and is subject to change in future releases. Added support for multi-party approvals (MPA) reviews: - Added the [`MultiPartyAuthReview`](https://developers.google.com/google-ads/api/reference/rpc/v23/MultiPartyAuthReview) resource and corresponding [`MultiPartyAuthReviewService`](https://developers.google.com/google-ads/api/reference/rpc/v23/MultiPartyAuthReviewService). - Added the [`MultiPartyAuthReviewStatus`](https://developers.google.com/google-ads/api/reference/rpc/v23/MultiPartyAuthReviewStatusEnum.MultiPartyAuthReviewStatus) enum to track the review status. - Added [`CustomerUserAccess.pending_multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v23/CustomerUserAccess#pending_multi_party_auth_review) to link to a pending review. - Added [`MutateCustomerUserAccessResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v23/MutateCustomerUserAccessResult#multi_party_auth_review) and [`MutateCustomerUserAccessInvitationResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v23/MutateCustomerUserAccessInvitationResult#multi_party_auth_review) to return the associated review resource name. - Added [`MultiPartyAuthReviewError`](https://developers.google.com/google-ads/api/reference/rpc/v23/MultiPartyAuthReviewErrorEnum.MultiPartyAuthReviewError) for validation errors. |

### v23.2 (2026-03-25)

The following new features and updates were added in Google Ads API v23.2. Minor
versions like v23.2 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Assets |||
| [`VideoEnhancement`](https://developers.google.com/google-ads/api/reference/rpc/v23/VideoEnhancement) | New resource | Contains enhancement-specific video ad information, such as whether it's Google-generated or advertiser-provided. See the [About video enhancements](https://support.google.com/google-ads/answer/13652431) to learn more. |
| [`AppTopCombinationView`](https://developers.google.com/google-ads/api/reference/rpc/v23/AppTopCombinationView) | New resource | Read-only resource to provide insights into top-performing asset combinations in App campaigns. |
| [`CustomerAsset`](https://developers.google.com/google-ads/api/reference/rpc/v23/CustomerAsset) | New feature | Added support to retrieve `CustomerAsset` with [`field_type`](https://developers.google.com/google-ads/api/reference/rpc/v23/AssetFieldTypeEnum.AssetFieldType) set to `BUSINESS_LOGO`. |
| Campaigns |||
| [`AdGroupAd.start_date_time`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupAd#start_date_time) [`AdGroupAd.end_date_time`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupAd#end_date_time) | New fields | Provide more granular scheduling constraints over the campaign's dates. This is only supported for some ad group types. |
| [`HotelSettingInfo.disable_hotel_setting`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign.HotelSettingInfo#disable_hotel_setting) | New field | Allows disabling the hotel feed in Demand Gen campaigns. |
| General |||
| [`CustomerClientLinkError`](https://developers.google.com/google-ads/api/reference/rpc/v23/CustomerClientLinkErrorEnum.CustomerClientLinkError) | New enum values / errors | Added two new error codes: `MAX_CUSTOMER_LIMIT_REACHED` and `ACCOUNT_CREATION_POLICY_VIOLATION`. |
| [`UserListCustomerTypeCategoryEnum.LOYALTY_SIGN_UPS`](https://developers.google.com/google-ads/api/reference/rpc/v22/UserListCustomerTypeCategoryEnum.UserListCustomerTypeCategory#loyalty_sign_ups) | Behavioral change | An error is now thrown when attempting to use this sunsetted user list customer type category. |
| Planning |||
| [`GenerateTrendingInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#generateTrendingInsights) [`GenerateCreatorInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#generateCreatorInsights) | New features | Added support for custom AND/OR combinations of entities, topics, and audiences. |
| [`ReachPlanService.GenerateReachForecast`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#generateReachForecast) | New enum values | Added new targetable age ranges, such as `AGE_RANGE_21_44` or `AGE_RANGE_21_49`. |
| [`youtube_select_lineup_targeting`](https://developers.google.com/google-ads/api/reference/rpc/v23/PlannableTargeting#youtube_select_lineup_targeting) | New field | Added to [`ReachPlanService.ListPlannableProducts`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#listPlannableProducts), which will replace `youtube_select_lineups`. Both fields are currently populated. |
| [`ReachPlanSurface`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanSurfaceEnum.ReachPlanSurface) | New enum value | Added `IN_STREAM_NON_SKIPPABLE_THIRTY_SECONDS` as a surface option. |
| [`Forecast`](https://developers.google.com/google-ads/api/reference/rpc/v23/Forecast) | New field | Added `clicks` for Demand Gen Max Clicks (CPC) in [`ReachPlanService.GenerateReachForecast`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#generateReachForecast). |
| [`partnership_opportunities`](https://developers.google.com/google-ads/api/reference/rpc/v23/YouTubeMetrics#partnership_opportunities[]) | New field | Added to [`ContentCreatorInsightsService.GenerateCreatorInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#generateCreatorInsights) and [`ContentCreatorInsightsService.GenerateTrendingInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#generateTrendingInsights). |
| Reports |||
| `biddable_indirect_install_first_in_app_conversion_micros` | New field | Added to [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign), [`Customer`](https://developers.google.com/google-ads/api/reference/rpc/v23/Customer), and [`AdGroup`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroup) resources. |
| Videos |||
| [`ShareablePreviewService`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreviewService) | New feature | Extended to support YouTube Live previews by setting [`preview_type`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreview#preview_type) to `YOUTUBE_LIVE_PREVIEW`. Added `UNSUPPORTED_AD_TYPE` and `TOO_MANY_RESOURCES_IN_REQUEST` to [`ShareablePreviewError`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShareablePreviewErrorEnum.ShareablePreviewError). This is only supported for some ad types. |

### v23.1 (2026-02-25)

The following new features and updates were added in Google Ads API v23.1. Minor
versions like v23.1 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Account management |||
| `advertising_partner_properties.allowed_domain` | New field | Added to [`ProductLinkInvitation`](https://developers.google.com/google-ads/api/reference/rpc/v23/ProductLinkInvitation) and [`ProductLink`](https://developers.google.com/google-ads/api/reference/rpc/v23/ProductLink) resources. The advertising partner will only be able to advertise on this domain. |
| [`Customer.contains_eu_political_advertising`](https://developers.google.com/google-ads/api/reference/rpc/v23/Customer) | New field | Retrieves the account-level declaration status of whether it contains political advertising targeted towards the EU, and returns an [`EuPoliticalAdvertisingStatus`](https://developers.google.com/google-ads/api/reference/rpc/v23/EuPoliticalAdvertisingStatusEnum.EuPoliticalAdvertisingStatus). |
| Campaigns |||
| [`Campaign.text_guidelines`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign#text_guidelines) | New field | Added support for text guidelines, which can be used with Performance Max and Search campaigns to programmatically control AI-generated text assets. Within `text_guidelines`, you can define [`term_exclusions`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign.TextGuidelines#term_exclusions[]) and [`messaging_restrictions`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign.TextGuidelines#messaging_restrictions[]). |
| `CampaignPrimaryStatusReason` | New enum values | Added `CAMPAIGN_NOT_BOOKED`, `BOOKING_HOLD_EXPIRING`, `BOOKING_HOLD_EXPIRED`, and `BOOKING_CANCELLED` to provide primary status reasons for campaigns with the `FIXED_CPM` bidding strategy. |
| [`Campaign.VideoCampaignSettings.reservation_ad_category_self_disclosure`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign.VideoCampaignSettings#reservation_ad_category_self_disclosure) [`Campaign.VideoCampaignSettings.booking_details`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign.VideoCampaignSettings#booking_details) | New fields | Added support for reservation ad category self disclosure and read-only booking details. |
| `Campaign.missing_eu_political_advertising_declaration` | New field | Supports querying and filtering campaigns that are missing declarations about whether they contain political advertising targeted towards the EU. |
| Conversions |||
| `ConversionActionCategory.YOUTUBE_FOLLOW_ON_VIEWS` | New enum value | Supports tracking users who watch an ad and later watch a video from the same channel. |
| General |||
| [`CriterionErrorEnum.CANNOT_TARGET_ONLY_UNDETERMINED`](https://developers.google.com/google-ads/api/reference/rpc/v23/CriterionErrorEnum.CriterionError#cannot_target_only_undetermined) | New enum value / error | Returned when attempting to target only the undetermined category in demographics dimensions. |
| Incentives |||
| [`IncentiveErrorEnum`](https://developers.google.com/google-ads/api/reference/rpc/v23/IncentiveErrorEnum.IncentiveError) | New enum values / errors | Added two new error codes: `MAX_INCENTIVES_REDEEMED` and `ACCOUNT_TOO_OLD`. These errors can be returned for requests made on or after March 11, 2026. |
| Planning |||
| [`GenerateBenchmarksMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v23/BenchmarksService#generatebenchmarksmetrics) | New feature | Added support for date breakdowns using a [`BreakdownDefinition`](https://developers.google.com/google-ads/api/reference/rpc/v23/BreakdownDefinition). |
| [`ReachPlanService.GenerateReachForecast`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#generateReachForecast) | New enum value | Added `GOOGLE_DISPLAY_NETWORK` as a targetable surface for Demand Gen Max Conversions. |
| [`GenerateTrendingInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/ContentCreatorInsightsService#generateTrendingInsights) | New fields | Added historical trend line information in [`TrendInsightDataPoint`](https://developers.google.com/google-ads/api/reference/rpc/v23/TrendInsightDataPoint) to [`TrendInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/TrendInsight) when searching by topic. |
| Reports |||
| Unique user frequency metrics | New fields | Added new metrics that report how many users saw your ad at least two, three, four, five or ten times: `unique_users_two_plus`, `unique_users_three_plus`, `unique_users_four_plus`, `unique_users_five_plus`, and `unique_users_ten_plus`. |
| [`SearchTermMatchSource`](https://developers.google.com/google-ads/api/reference/rpc/v23/SearchTermMatchSourceEnum.SearchTermMatchSource) | New enum value | Added `VERTICAL_ADS_DATA_FEED` to support vertical ad data feeds, such as Travel Ads entity targeting. |
| YouTubeVideoUpload |||
| `YouTubeVideoUpload` | New service / resource | Added the `YouTubeVideoUpload` service to support uploading and managing videos on YouTube, and the `YouTubeVideoUpload` resource to support fetching upload status and metadata. This feature is only supported for REST and the Python client library. |

### v23 (2026-01-28)

<br />

[Video](https://www.youtube.com/watch?v=HTsB6xjSUfw)

<br />

The following new features, updates, and breaking changes were added in Google Ads API
v23, which is a major release.

See [Upgrade to the latest version](https://developers.google.com/google-ads/api/docs/upgrade) for guidance.

#### Breaking changes

| Initial state | New state | Change type | Implementation guidance |
|---|---|---|---|
| Ads ||||
| Ad sharing permitted | [`AdGroupAdError.AD_SHARING_NOT_ALLOWED`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupAdErrorEnum.AdGroupAdError#ad_sharing_not_allowed) | Behavioral shift | Ad sharing among multiple ad groups is no longer permitted. Requests attempting to share ads will return an `AD_SHARING_NOT_ALLOWED` error. |
| Support for `CallAd` and `CallAdInfo` | None | Removal | Support for call ads has been removed. Refer to the [About call ads](https://support.google.com/google-ads/answer/6341403) help center article. |
| Campaigns ||||
| `Campaign.start_date` `Campaign.end_date` | [`Campaign.start_date_time`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign#start_date_time) [`Campaign.end_date_time`](https://developers.google.com/google-ads/api/reference/rpc/v23/Campaign#end_date_time) | Rename / replacement | Use the new date-time fields to specify time components for campaigns. The original date-only fields are removed. |
| Demand Gen ||||
| `DemandGenMultiAssetAdInfo.lead_form_only` | None | Removal | The `lead_form_only` field has been removed. Update references in your code. |
| Reports ||||
| Aggregate asset performance label metrics and enum | None | Removal | Removed aggregate asset performance label metrics. The performance label enum is no longer returned for Search and Display. |

#### Features and updates (non-breaking)

| Features and updates | Type | Description |
|---|---|---|
| Ads |||
| [`AdFormatType`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdFormatTypeEnum.AdFormatType) | New enum values | Added new format types: `TEXT`, `VERTICAL_ADS_BOOKING_LINK`, and `VERTICAL_ADS_PROMOTION`. |
| Assets |||
| [`asset_group`](https://developers.google.com/google-ads/api/fields/v25/asset_group) view | New fields | Added the following metrics: [`metrics.engagements`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.engagements), [`metrics.engagement_rate`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.engagement_rate), and [`metrics.average_cpe`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.average_cpe). |
| [`asset_group_asset`](https://developers.google.com/google-ads/api/fields/v25/asset_group_asset) view | New fields | Added the following metrics: [`metrics.average_cpe`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.average_cpe), [`metrics.average_cpm`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.average_cpm), [`metrics.trueview_average_cpv`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.trueview_average_cpv), [`metrics.video_trueview_view_rate`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.video_trueview_view_rate), [`metrics.video_trueview_views`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.video_trueview_views), and [`metrics.interaction_event_types`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.interaction_event_types). |
| [`Asset.orientation`](https://developers.google.com/google-ads/api/reference/rpc/v23/Asset#orientation) | New field | Read-only orientation field added to image and video assets. |
| [`CampaignAsset`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignAsset) | New feature | Added support to retrieve campaign assets with [`field_type`](https://developers.google.com/google-ads/api/reference/rpc/v23/AssetFieldTypeEnum.AssetFieldType) set to `HEADLINE` and `DESCRIPTION`. |
| [`ServedAssetFieldType`](https://developers.google.com/google-ads/api/reference/rpc/v23/ServedAssetFieldTypeEnum.ServedAssetFieldType) | New enum values | Added `HEADLINE_AS_SITELINK_POSITION_ONE`, `HEADLINE_AS_SITELINK_POSITION_TWO`, `DESCRIPTION_LINE_HEADLINE_AS_SITELINK_POSITION_ONE`, and `DESCRIPTION_LINE_HEADLINE_AS_SITELINK_POSITION_TWO` for assets served as sitelinks. |
| [`BusinessMessageAsset`](https://developers.google.com/google-ads/api/reference/rpc/v23/BusinessMessageAsset) | New features / support | Updated Business Message assets: - Added support for Facebook Messenger and Zalo as providers. - Added `FACEBOOK_MESSENGER` and `ZALO` to [`BusinessMessageProvider`](https://developers.google.com/google-ads/api/reference/rpc/v23/BusinessMessageProviderEnum.BusinessMessageProvider). - Added fields `facebook_messenger_info` and `zalo_info`. - Added [`CUSTOMER_NOT_ON_ALLOWLIST_FOR_MESSAGE_ASSETS`](https://developers.google.com/google-ads/api/reference/rpc/v23/AssetErrorEnum.AssetError#customer_not_on_allowlist_for_message_assets) to [`AssetError`](https://developers.google.com/google-ads/api/reference/rpc/v23/AssetErrorEnum.AssetError). |
| Billing |||
| [`InvoiceService.ListInvoices`](https://developers.google.com/google-ads/api/reference/rpc/v23/InvoiceService#listinvoices) | New options | Can now return more granular details in [`Invoice`](https://developers.google.com/google-ads/api/reference/rpc/v23/Invoice), including campaign-level cost breakdown, itemized regulatory costs, and adjustment information, by setting `include_granular_level_invoice_details` in [`ListInvoicesRequest`](https://developers.google.com/google-ads/api/reference/rpc/v23/ListInvoicesRequest). |
| [`RegulatoryFeeType`](https://developers.google.com/google-ads/api/reference/rpc/v23/RegulatoryFeeTypeEnum.RegulatoryFeeType) [`UnitOfMeasure`](https://developers.google.com/google-ads/api/reference/rpc/v23/UnitOfMeasureEnum.UnitOfMeasure) | New enums | Added helper enums for regulatory fees and units of measure. |
| Campaigns |||
| [`CampaignError`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignErrorEnum.CampaignError) | New enum values / errors | Added `DURATION_TOO_LONG_FOR_TOTAL_BUDGET` and `END_DATE_TIME_REQUIRED_FOR_TOTAL_BUDGET` error codes. |
| Conversions |||
| ConversionActionCategory | New enum value | Added `YOUTUBE_FOLLOW_ON_VIEWS` to support tracking users who watch an ad and later watch a video from the same channel. |
| Demand Gen |||
| [`DemandGenVideoResponsiveAdInfo.companion_banner`](https://developers.google.com/google-ads/api/reference/rpc/v23/DemandGenVideoResponsiveAdInfo#companion_banners) | New field | Added support for companion banners in Demand Gen responsive video ads. |
| Incentives |||
| Added Choose Your Own (CYO) incentives support: - Added the [`FetchIncentive`](https://developers.google.com/google-ads/api/reference/rpc/v23/IncentiveService#fetchincentive) method to retrieve available personalized incentives for a user. - Added the [`ApplyIncentive`](https://developers.google.com/google-ads/api/reference/rpc/v23/IncentiveService#applyincentive) method to apply a selected incentive to a customer account. - Added the [`AppliedIncentive`](https://developers.google.com/google-ads/api/reference/rpc/v23/AppliedIncentive) resource (queryable using [`Search`](https://developers.google.com/google-ads/api/reference/rpc/v23/GoogleAdsService#search) and [`SearchStream`](https://developers.google.com/google-ads/api/reference/rpc/v23/GoogleAdsService#searchstream)) to provide redemption details. - Added new error codes in [`IncentiveError`](https://developers.google.com/google-ads/api/reference/rpc/v23/IncentiveErrorEnum.IncentiveError) and [`AuthenticationError.INVALID_EMAIL_ADDRESS`](https://developers.google.com/google-ads/api/reference/rpc/v23/AuthenticationErrorEnum.AuthenticationError#invalid_email_address). To facilitate more granular programmatic handling of failures, we will add additional error codes to `IncentivesService` in future releases. We recommend that you monitor upcoming announcements and release notes for these new error codes to make sure your applications can manage these new failure modes. |
| Planning |||
| [`AudienceInsightsDimension.LIFE_EVENT_USER_INTEREST`](https://developers.google.com/google-ads/api/reference/rpc/v23/AudienceInsightsDimensionEnum.AudienceInsightsDimension#life_event_user_interest) | New enum value | Allows building audiences using Life Events in `GenerateAudienceCompositionInsights`, `GenerateSuggestedTargetingInsights`, `GenerateInsightsFinderReport`, and `GenerateCreatorInsights`. Life Events are not supported for other [`AudienceInsightsService`](https://developers.google.com/google-ads/api/reference/rpc/v23/AudienceInsightsService) methods such as `AudienceInsightsService.GenerateAudienceOverlap` and `AudienceInsightsService.GenerateTargetingSuggestionMetrics`. |
| [`ReachPlanService.GenerateConversionRates`](https://developers.google.com/google-ads/api/reference/rpc/v23/ReachPlanService#generateconversionrates) | New fields / options | The response now includes surfaces to support conversion rate suggestions based on surface controls (e.g., Gmail, Shorts). Only supported for Demand Gen campaigns. |
| [`LanguageDistribution`](https://developers.google.com/google-ads/api/reference/rpc/v23/LanguageDistribution) | New field / type | Added to [`YouTubeChannelInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/YouTubeChannelInsights) to provide language distribution details in YouTube channel content. |
| [`BenchmarksService`](https://developers.google.com/google-ads/api/reference/rpc/v23/BenchmarksService) | New service | Compares YouTube advertisement data against industry benchmarks. |
| [`AudienceInsightsService.GenerateAudienceDefinition`](https://developers.google.com/google-ads/api/reference/rpc/v23/AudienceInsightsService#generateAudienceDefinition) | New method | Translates a free text description of a target audience into matching audience attributes using generative AI. |
| [`YouTubeChannelInsights.relevance_score`](https://developers.google.com/google-ads/api/reference/rpc/v23/YouTubeChannelInsights#relevance_score) | New field | Evaluates how relevant a creator is for a topic weighted by views. |
| [`TrendInsightMetrics.trend_change_percent`](https://developers.google.com/google-ads/api/reference/rpc/v23/TrendInsightMetrics#trend_change_percent) | New field | Represents the percentage change in a trend's value over the comparison period. |
| Recommendations |||
| [`GenerateRecommendationsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v23/GenerateRecommendationsRequest) | New field | Added `is_new_customer`. When set to `true` for `CAMPAIGN_BUDGET` recommendations, it uses a model optimized for new customers (only recommended for customers with no campaigns). |
| Reports |||
| [`AdGroupAdAssetView`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupAdAssetView) | New feature / metrics support | Now supports impression, performance, and conversion metrics for [`RESPONSIVE_DISPLAY_AD`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdTypeEnum.AdType#responsive_display_ad). |
| [`ad_sub_network_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_sub_network_type) segment | New segment | Provides granular performance breakdown within an ad network. Initially available for Demand Gen campaigns on YouTube (In-stream, In-feed, Shorts). Must be selected along with `ad_network_type`. |
| Performance Max reporting | New feature | Enabled ad network type breakdown for Performance Max campaigns. |
| [`UserLocationView`](https://developers.google.com/google-ads/api/reference/rpc/v23/UserLocationView) [`GeographicView`](https://developers.google.com/google-ads/api/reference/rpc/v23/GeographicView) | New segments support | Support metrics segmented by conversion date: `conversions_by_conversion_date`, `all_conversions_by_conversion_date`, `conversions_value_by_conversion_date`, `all_conversions_value_by_conversion_date`, `value_per_conversions_by_conversion_date`, `value_per_all_conversions_by_conversion_date`, `cross_device_conversions_by_conversion_date`, and `cross_device_conversions_value_by_conversion_date`. |
| Vertical ads segments | New segments | Added the following segments: `vertical_ads_event_participant_display_names`, `vertical_ads_hotel_class`, `vertical_ads_listing`, `vertical_ads_listing_brand`, `vertical_ads_listing_city`, `vertical_ads_listing_country`, `vertical_ads_listing_region`, `vertical_ads_partner_account`, and `vertical_ads_vertical`. |
| [`PerStoreView`](https://developers.google.com/google-ads/api/reference/rpc/v23/PerStoreView) [`MatchedLocationInterestView`](https://developers.google.com/google-ads/api/reference/rpc/v23/MatchedLocationInterestView) | New reporting resources | Added `PerStoreView` to query store location details, and `MatchedLocationInterestView` (for AI Max campaigns) to provide performance metrics by geographic locations of interest. |
| Shopping |||
| [`ShoppingPerformanceView`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShoppingPerformanceView) | New metrics support | Now supports the following metrics segmented by conversion date: `conversions_by_conversion_date`, `all_conversions_by_conversion_date`, `conversions_value_by_conversion_date`, and `value_per_conversions_by_conversion_date`, `value_per_all_conversions_by_conversion_date`. |
| [`ShoppingPerformanceView`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShoppingPerformanceView) | New metrics support | Added support for: `search_budget_lost_impression_share`, `search_rank_lost_impression_share`, `search_budget_lost_absolute_top_impression_share`, and `search_rank_lost_absolute_top_impression_share`. |
| [`ShoppingProduct.product_image_uri`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShoppingProduct#product_image_uri) | New field | Added to [`ShoppingProduct`](https://developers.google.com/google-ads/api/reference/rpc/v23/ShoppingProduct). |
| Vertical ads |||
| [`AdGroup.vertical_ads_format_setting`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroup#vertical_ads_format_setting) | New field | Allows control over which ad formats can serve in Search campaigns using travel feeds. |
| [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupCriterion) [`SharedCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v23/SharedCriterion) | New fields / criteria | Added `vertical_ads_item_group_rule_list` criterion type to `AdGroupCriterion` and `vertical_ads_item_group_rule` to `SharedCriterion` to permit targeting item groups in Search campaigns with travel feeds. |
| Vertical ads data feed integration | New feature | Can now connect a vertical ads data feed to a search campaign running AI Max to show property promotion and booking link travel ads alongside text ads. Control formats with [`vertical_ads_format_setting`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroup#vertical_ads_format_setting) and define rules using `vertical_ads_item_group_rule`. Segment reporting by [`AdFormatType`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdFormatTypeEnum.AdFormatType) and vertical ads data feed dimensions. |
| Videos |||
| [`AdVideoAssetInfo.ad_video_asset_feature_control`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdVideoAssetInfo#ad_video_asset_feature_control) | New field | Added feature control options for video ad assets. |
| [`CampaignCriterionError`](https://developers.google.com/google-ads/api/reference/rpc/v23/CampaignCriterionErrorEnum.CampaignCriterionError#invalid_video_lineup_id) | New enum value / error | Added the `INVALID_VIDEO_LINEUP_ID` error code. |
| YouTube audibility metrics | New metrics | Added audibility metrics for audio ads on YouTube, reporting whether an ad was audible and on how many impressions audibility could be measured. |

<br />

## v22 major and minor versions

Google Ads API v22 includes the following new features, updates, and breaking changes.

### v22.2 (2026-06-24)

The following new features and updates were added in Google Ads API v22.2. Minor
versions like v22.2 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| General |||
| [`Asset.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v22/Asset#synthetic_content_info) [`Ad.synthetic_content_info`](https://developers.google.com/google-ads/api/reference/rpc/v22/Ad#synthetic_content_info) | New fields | Contain attestations for synthetic/AI-generated content, split into [`advertiser_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v22/SyntheticContentInfo#advertiser_attestation) (declarations provided directly by the advertiser) and [`system_attestation`](https://developers.google.com/google-ads/api/reference/rpc/v22/SyntheticContentInfo#system_attestation) (attestations automatically detected or provided by Google's systems). To help you plan your upcoming integration work for v25, the interface for mutating advertiser attestation fields is being introduced early for v22 and higher. The interface is visible in these versions, but `synthetic_content_info.advertiser_attestation.status` and `synthetic_content_info.advertiser_attestation.source` will remain immutable for these versions. If you attempt a mutate request on either of these fields, one of these errors will be returned: "The field attempted to be mutated is immutable" or "Field cannot be set". These fields will become fully mutable starting in v25. We recommend using the interface now to build and test your internal logic so your system is ready for full write capabilities when v25 is launched. |
| Multi-party approvals | New features | > [!WARNING] > **Beta:** This feature is currently in beta and is subject to change in future releases. Added support for multi-party approvals (MPA) reviews: - Added the [`MultiPartyAuthReview`](https://developers.google.com/google-ads/api/reference/rpc/v22/MultiPartyAuthReview) resource and corresponding [`MultiPartyAuthReviewService`](https://developers.google.com/google-ads/api/reference/rpc/v22/MultiPartyAuthReviewService). - Added the [`MultiPartyAuthReviewStatus`](https://developers.google.com/google-ads/api/reference/rpc/v22/MultiPartyAuthReviewStatusEnum.MultiPartyAuthReviewStatus) enum to track the review status. - Added [`CustomerUserAccess.pending_multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v22/CustomerUserAccess#pending_multi_party_auth_review) to link to a pending review. - Added [`MutateCustomerUserAccessResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v22/MutateCustomerUserAccessResult#multi_party_auth_review) and [`MutateCustomerUserAccessInvitationResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v22/MutateCustomerUserAccessInvitationResult#multi_party_auth_review) to return the associated review resource name. - Added [`MultiPartyAuthReviewError`](https://developers.google.com/google-ads/api/reference/rpc/v22/MultiPartyAuthReviewErrorEnum.MultiPartyAuthReviewError) for validation errors. |

### v22.1 (2026-02-25)

The following new feature was added in Google Ads API v22.1. Minor versions like v22.1
don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Account management |||
| [`Customer.contains_eu_political_advertising`](https://developers.google.com/google-ads/api/reference/rpc/v22/Customer) | New field | Retrieves the account-level declaration status of whether it contains political advertising targeted towards the EU, and returns an [`EuPoliticalAdvertisingStatus`](https://developers.google.com/google-ads/api/reference/rpc/v22/EuPoliticalAdvertisingStatusEnum.EuPoliticalAdvertisingStatus). |
| Campaigns |||
| `Campaign.missing_eu_political_advertising_declaration` | New field | Supports querying and filtering campaigns that are missing declarations about whether they contain political advertising targeted towards the EU. |

### v22 (2025-10-15)

The following new features, updates, and breaking changes were added in Google Ads API
v22, which is a major release.

See [Upgrade to the latest version](https://developers.google.com/google-ads/api/docs/upgrade) for guidance.

#### Breaking changes

| Initial state | New state | Change type | Implementation guidance |
|---|---|---|---|
| Demand Gen ||||
| `BudgetPerDayMinimumErrorDetails.minimum_bugdet_amount_micros` | [`minimum_budget_amount_micros`](https://developers.google.com/google-ads/api/reference/rpc/v22/BudgetPerDayMinimumErrorDetails#minimum_budget_amount_micros) | Rename / spelling fix | Rename references to use the corrected field name. |
| General ||||
| No operations limit in [`AddBatchJobOperations`](https://developers.google.com/google-ads/api/reference/rpc/v22/BatchJobService#addbatchjoboperations) | 10,000 operations limit per request | Behavioral shift | Ensure that no single `AddBatchJobOperations` request contains more than 10,000 operations. |
| Silently capped page size at 1,000 in [`ListBatchJobResultsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v22/ListBatchJobResultsRequest) | Returns `INVALID_PAGE_SIZE` error | Behavioral shift | Ensure `ListBatchJobResultsRequest.page_size` is set to 1,000 or less, as requesting a larger page size will now result in an error. |
| Performance Max ||||
| Asset performance labels | None | Removal | Asset performance labels support and the associated performance label enum have been removed for Performance Max campaigns. Update integrations accordingly. |
| [`Campaign.url_expansion_opt_out`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign#url_expansion_opt_out) | `FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION` flag in [`AssetAutomationSetting`](https://developers.google.com/google-ads/api/reference/rpc/v22/Campaign#asset_automation_settings[]) | Removal / replacement | Use the final URL expansion text asset automation setting. The Campaign-level URL expansion opt-out field is removed. |
| Planning ||||
| [`views`](https://developers.google.com/google-ads/api/reference/rpc/v22/ReachPlanService#views) | [`trueview_views`](https://developers.google.com/google-ads/api/reference/rpc/v22/ReachPlanService#trueview_views) | Removal / replacement | Replace references to `views` with the new `trueview_views` field in [`ReachPlanService`](https://developers.google.com/google-ads/api/reference/rpc/v22/ReachPlanService). |
| Videos ||||
| `average_cpv` `video_view_rate` `video_views` `video_view_rate_in_feed` `video_view_rate_in_stream` `video_view_rate_shorts` | [`trueview_average_cpv`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#trueview_average_cpv) [`video_trueview_view_rate`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_trueview_view_rate) [`video_trueview_views`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_trueview_views) [`video_trueview_view_rate_in_feed`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_trueview_view_rate_in_feed) [`video_trueview_view_rate_in_stream`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_trueview_view_rate_in_stream) [`video_trueview_view_rate_shorts`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_trueview_view_rate_shorts) | Renames | Update query strings and integrations to use the new metric names representing TrueView video views. |

#### Features and updates (non-breaking)

| Features and updates | Type | Description |
|---|---|---|
| Assets |||
| [`AssetFieldType.LANDING_PAGE_PREVIEW`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetFieldTypeEnum.AssetFieldType#landing_page_preview) | New enum value | Added as a new image asset field type. |
| [`AssetGenerationService`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetGenerationService) | New service (Beta) | Allows generating text and image assets using generative AI: - [`GenerateText`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetGenerationService/GenerateText): Generates text based on final URL, prompts, keywords, etc. - [`GenerateImages`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetGenerationService/GenerateImages): Generates images based on final URL, prompts, or recontextualizing product images. - Errors are returned with codes from [`AssetGenerationError`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetGenerationErrorEnum.AssetGenerationError). Initially available only to a limited set of closed beta participants. |
| Campaigns |||
| [`AppCampaignBiddingStrategyGoalType`](https://developers.google.com/google-ads/api/reference/rpc/v22/AppCampaignBiddingStrategyGoalTypeEnum.AppCampaignBiddingStrategyGoalType) | New enum values | Added new goals for App campaigns for installs (ACi) to optimize without specifying a target: - `OPTIMIZE_IN_APP_CONVERSIONS_WITHOUT_TARGET_CPA`: Use with standard Maximize Conversions. - `OPTIMIZE_TOTAL_VALUE_WITHOUT_TARGET_ROAS`: Use with standard Maximize Conversion Value. |
| `BiddingStrategyType` | New feature | Added support for the fixed share of voice bidding strategy type. |
| [`Campaign.feed_types`](https://developers.google.com/google-ads/api/reference/rpc/v22/Campaign#feed_types[]) | New field | Shows the types of feeds attached to a campaign. For Performance Max campaigns, this can indicate the business vertical, such as `MERCHANT_CENTER_FEED` for retail. |
| Shared set targeting | New feature | Allowed attaching negative keywords shared sets to multi-channel (for App campaigns) and local campaigns. |
| Demand Gen |||
| TargetCPC bidding | New feature | Added bidding strategy to maximize clicks at target CPC: set campaign-level target CPC using [`Campaign.target_cpc`](https://developers.google.com/google-ads/api/reference/rpc/v22/Campaign#target_cpc) and override at ad group level using [`AdGroup.target_cpc_micros`](https://developers.google.com/google-ads/api/reference/rpc/v22/AdGroup#target_cpc_micros). |
| `AssetAutomationType.GENERATE_DESIGN_VERSIONS_FOR_IMAGES` | New enum value | If enabled for [`DemandGenMultiAssetAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v22/DemandGenMultiAssetAdInfo), this adds design elements and embeds text assets into image assets to create new image assets with different aspect ratios (enabled by default). |
| `AssetAutomationType.GENERATE_VIDEOS_FROM_OTHER_ASSETS` | New enum value | If enabled for [`DemandGenMultiAssetAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v22/DemandGenMultiAssetAdInfo), it generates videos using other assets like images and text, which can then be used to create new [`DemandGenVideoResponsiveAdInfo`](https://developers.google.com/google-ads/api/reference/rpc/v22/DemandGenVideoResponsiveAdInfo) instances (enabled by default). |
| General |||
| [`ListBatchJobResultsRequest`](https://developers.google.com/google-ads/api/reference/rpc/v22/ListBatchJobResultsRequest) page size fallback | Behavioral change | If `page_size` is not set or is 0, it now defaults to the maximum of 1,000 (previously returned `INVALID_PAGE_SIZE`). |
| [`QuotaError`](https://developers.google.com/google-ads/api/reference/rpc/v22/QuotaErrorEnum.QuotaError) | New enum value / error | Added `PAYMENTS_PROFILE_ACTIVATION_RATE_LIMIT_EXCEEDED` to indicate when payment profile activation rate limit is exceeded. |
| Performance Max |||
| Asset automation settings | New enum values | Added new PMax asset automation options: - `GENERATE_IMAGE_ENHANCEMENT`: Enables automatic creation of enhanced images (auto-cropping). Enabled by default. - `GENERATE_IMAGE_EXTRACTION`: Sourced images from final URLs. Defaults to account Dynamic Image Extension setting. |
| PMax reporting segments | New segments | Added new segments unique to Performance Max campaigns: - [`ad_using_product_data`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_using_product_data): Indicates if an ad uses Google Merchant Center product data. - [`ad_using_video`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.ad_using_video): Indicates if an ad uses a video asset. |
| Planning |||
| CRM partner data lists | New feature / enum value | Added [`THIRD_PARTY_PARTNER_DATA`](https://developers.google.com/google-ads/api/reference/rpc/v22/UserListCrmDataSourceTypeEnum.UserListCrmDataSourceType#third_party_partner_data) to CRM data sources, along with partner audience validation error codes (such as tos acceptance, Link missing, etc.). |
| Livestream creator metrics | New field | Added [`YouTubeMetrics.is_active_live_stream_creator`](https://developers.google.com/google-ads/api/reference/rpc/v22/YouTubeMetrics#is_active_live_stream_creator), returned by creator insights to indicate if a creator published a livestream in the past 90 days. |
| Plannable CRM source metadata | New message | Added [`PlannableUserListMetadata`](https://developers.google.com/google-ads/api/reference/rpc/v22/PlannableUserListMetadata) inside [`PlannableUserList`](https://developers.google.com/google-ads/api/reference/rpc/v22/PlannableUserList), returned by `ReachPlanService.ListPlannableUserLists`, to show CRM data source types. |
| Support for related videos and creators in TrendInsight | New fields | Added support for [`related_videos`](https://developers.google.com/google-ads/api/reference/rpc/v22/TrendInsight#related_videos[]) and [`related_creators`](https://developers.google.com/google-ads/api/reference/rpc/v22/TrendInsight#related_creators[]) on [`TrendInsight`](https://developers.google.com/google-ads/api/reference/rpc/v22/TrendInsight), and watch properties in [`video_properties`](https://developers.google.com/google-ads/api/reference/rpc/v22/YouTubeVideoAttributeMetadata#video_properties[]) and [`publish_date`](https://developers.google.com/google-ads/api/reference/rpc/v22/YouTubeVideoAttributeMetadata#publish_date). |
| InsightsFinder improvements | New feature | [`GenerateInsightsFinderReport`](https://developers.google.com/google-ads/api/reference/rpc/v22/AudienceInsightsService#generateinsightsfinderreport) now supports [`parental_status`](https://developers.google.com/google-ads/api/reference/rpc/v22/InsightsAudience#parental_status), [`income_ranges`](https://developers.google.com/google-ads/api/reference/rpc/v22/InsightsAudience#income_ranges[]), and more complex AND/OR targeting combinations. |
| Reports |||
| New click types | New enum values | Added [`CLICK_TO_MESSAGE_THIRD_PARTY_CLICK`](https://developers.google.com/google-ads/api/reference/rpc/v22/ClickTypeEnum.ClickType#click_to_message_third_party_click) and [`CLICK_TO_MESSAGE_LANDING_PAGE_CLICK`](https://developers.google.com/google-ads/api/reference/rpc/v22/ClickTypeEnum.ClickType#click_to_message_landing_page_click). |
| AssetGroupAsset segmentation | New segments support | [`AssetGroupAsset`](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetGroupAsset) is now segmentable by [`device`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.device), `conversion_action`, `conversion_action_name`, and [`conversion_action_category`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.conversion_action_category). |
| RSAs in AdGroupAdAssetView | New feature / metrics support | [`AdGroupAdAssetView`](https://developers.google.com/google-ads/api/reference/rpc/v22/AdGroupAdAssetView) now fully supports performance and conversion metrics for [`RESPONSIVE_SEARCH_AD`](https://developers.google.com/google-ads/api/reference/rpc/v22/AdTypeEnum.AdType#responsive_search_ad) (previously only impressions were returned). |
| Exploration query cluster metric segmentations | New segments support | Metrics `clicks_unique_query_clusters`, `conversions_unique_query_clusters`, and `impressions_unique_query_clusters` are now segmentable by date fields. |
| TargetingExpansionView | New reporting resource | Added [`TargetingExpansionView`](https://developers.google.com/google-ads/api/reference/rpc/v22/TargetingExpansionView) to report metrics for expansions over manual targeting, such as keywordless expansion for AI Max for Search Campaigns. |
| Shopping |||
| Shopping scope fix | Bug fix | Fixed the campaign and ad group scoping of metrics in the [`ShoppingProduct`](https://developers.google.com/google-ads/api/reference/rpc/v22/ShoppingProduct) resource. |
| Unified goals |||
| Retention goals | New feature | Added support for customer retention goals to optimize for re-engaging existing customers (e.g., using [`target_option`](https://developers.google.com/google-ads/api/reference/rpc/v22/CampaignGoalSettings.CampaignRetentionGoalSettings#target_option) with [`TARGET_SPECIFIC`](https://developers.google.com/google-ads/api/reference/rpc/v22/CustomerLifecycleOptimizationModeEnum.CustomerLifecycleOptimizationMode#target_specific) or [`TARGET_ALL`](https://developers.google.com/google-ads/api/reference/rpc/v22/CustomerLifecycleOptimizationModeEnum.CustomerLifecycleOptimizationMode#target_all)). |
| Videos |||
| Video watch time metrics | New fields | Added watch time duration metrics: [`video_watch_time_duration_millis`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#video_watch_time_duration_millis) (total duration) and [`average_video_watch_time_duration_millis`](https://developers.google.com/google-ads/api/reference/rpc/v22/Metrics#average_video_watch_time_duration_millis) (average duration per impression). |

<br />

## v21 major and minor versions

Google Ads API v21 includes the following new features, updates, and breaking changes.

### v21.2 (2026-06-24)

The following new features and updates were added in Google Ads API v21.2. Minor
versions like v21.2 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| General |||
| Multi-party approvals | New features | > [!WARNING] > **Beta:** This feature is currently in beta and is subject to change in future releases. Added support for multi-party approvals (MPA) reviews: - Added the [`MultiPartyAuthReview`](https://developers.google.com/google-ads/api/reference/rpc/v21/MultiPartyAuthReview) resource and corresponding [`MultiPartyAuthReviewService`](https://developers.google.com/google-ads/api/reference/rpc/v21/MultiPartyAuthReviewService). - Added the [`MultiPartyAuthReviewStatus`](https://developers.google.com/google-ads/api/reference/rpc/v21/MultiPartyAuthReviewStatusEnum.MultiPartyAuthReviewStatus) enum to track the review status. - Added [`CustomerUserAccess.pending_multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v21/CustomerUserAccess#pending_multi_party_auth_review) to link to a pending review. - Added [`MutateCustomerUserAccessResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v21/MutateCustomerUserAccessResult#multi_party_auth_review) and [`MutateCustomerUserAccessInvitationResult.multi_party_auth_review`](https://developers.google.com/google-ads/api/reference/rpc/v21/MutateCustomerUserAccessInvitationResult#multi_party_auth_review) to return the associated review resource name. - Added [`MultiPartyAuthReviewError`](https://developers.google.com/google-ads/api/reference/rpc/v21/MultiPartyAuthReviewErrorEnum.MultiPartyAuthReviewError) for validation errors. |

### v21.1 (2026-02-25)

The following new features and updates were added in Google Ads API v21.1. Minor
versions like v21.1 don't contain breaking changes.

| Features and updates | Type | Description |
|---|---|---|
| Account management |||
| [`Customer.contains_eu_political_advertising`](https://developers.google.com/google-ads/api/reference/rpc/v21/Customer) | New field | Retrieves the account-level declaration status of whether it contains political advertising targeted towards the EU, and returns an [`EuPoliticalAdvertisingStatusEnum`](https://developers.google.com/google-ads/api/reference/rpc/v23/EuPoliticalAdvertisingStatusEnum). |
| Campaigns |||
| `Campaign.missing_eu_political_advertising_declaration` | New field | Supports querying and filtering campaigns that are missing declarations about whether they contain political advertising targeted towards the EU. |

### v21 (2025-08-06)

<br />

[Video](https://www.youtube.com/watch?v=g2oOeU0syjM)

<br />

The following new features, updates, and breaking changes were added in Google Ads API
v21, which is a major release.

See [Upgrade to the latest version](https://developers.google.com/google-ads/api/docs/upgrade) for guidance.

#### Breaking changes

| Initial state | New state | Change type | Implementation guidance |
|---|---|---|---|
| Campaigns ||||
| Returns [`CriterionError.INVALID_LISTING_GROUP_HIERARCHY`](https://developers.google.com/google-ads/api/reference/rpc/v21/CriterionErrorEnum.CriterionError#invalid_listing_group_hierarchy) | Returns [`CriterionError.LISTING_GROUP_ERROR_IN_ANOTHER_OPERATION`](https://developers.google.com/google-ads/api/reference/rpc/v21/CriterionErrorEnum.CriterionError#listing_group_error_in_another_operation) | Error code change | For requests with a partial failure enabled, handle the new error code instead of the original hierarchy error code. |
| Conversions ||||
| Access to `debug_enabled` mode in [`ConversionUploadService`](https://developers.google.com/google-ads/api/reference/rpc/v21/ConversionUploadService) | None | Removal | The `debug_enabled` field is removed. Update code referencing it to not set or query this parameter. |
| EU political advertising changes ||||
| Optional campaign self-declarations for EU political advertising | Required [`contains_eu_political_advertising`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign#contains_eu_political_advertising) field for new campaigns | Validation rule / behavioral shift | API calls to create new campaigns will fail with a [`FieldError.REQUIRED`](https://developers.google.com/google-ads/api/reference/rpc/v21/FieldErrorEnum.FieldError#required) error if this field is not set. Starting September 22, 2025, campaigns declared as `CONTAINS_EU_POLITICAL_ADVERTISING` will no longer serve in the EU. |
| Modifiable criteria without self-declaration | Fails updates with [`CriterionError.MISSING_EU_POLITICAL_ADVERTISING_SELF_DECLARATION`](https://developers.google.com/google-ads/api/reference/rpc/v21/CriterionErrorEnum.CriterionError#missing_eu_political_advertising_self_declaration) | Validation rule / behavioral shift | Set the self-declaration status before attempting to create or update campaign- or ad group-level proximity, location, or location group targeting criteria for existing campaigns. |
| Experiments without self-declaration requirements | Fails updates with [`ExperimentError.MISSING_EU_POLITICAL_ADVERTISING_SELF_DECLARATION`](https://developers.google.com/google-ads/api/reference/rpc/v21/ExperimentErrorEnum.ExperimentError#missing_eu_political_advertising_self_declaration) | Validation rule / behavioral shift | Ensure that the self-declarations have been completed on the experiment's campaigns. |
| Performance Max ||||
| [`brand_guidelines_enabled`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign#brand_guidelines_enabled) defaults to `false` | Defaults to `true` | Behavioral shift | For new Performance Max campaigns, brand guidelines are enabled by default. Explicitly set the field to `false` if they should be disabled. |
| Planning ||||
| Original input argument type for [`AudienceInsightsService.GenerateTargetingSuggestionMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v21/AudienceInsightsService/GenerateTargetingSuggestionMetrics) | Input of type [`InsightsAudience`](https://developers.google.com/google-ads/api/reference/rpc/v21/InsightsAudience) | Type change | Update implementations to pass the new input type which supports an AND-of-ORs combination of user interests, permitting potential reach metrics for custom audience definitions. |

#### Features and updates (non-breaking)

| Features and updates | Type | Description |
|---|---|---|
| AI Max for Search campaigns |||
| [`ai_max_setting.enable_ai_max`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign.AiMaxSetting#enable_ai_max) in [`Campaign`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign) | New field | Enables AI Max to expand search term matching (respecting previous text asset automation and brand lists until toggled off). The field [`Campaign.ai_max_setting.bundling_required`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign.AiMaxSetting#bundling_required) indicates if AI Max must be enabled to respect/modify those settings, and [`AdGroup.ai_max_ad_group_setting.disable_search_term_matching`](https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroup.AiMaxAdGroupSetting#disable_search_term_matching) can disable matching at the ad group level. See [Unlock next-level performance with AI Max for Search campaigns](https://blog.google/products/ads-commerce/google-ai-max-for-search-campaigns/). |
| [`CampaignError.AI_MAX_MUST_BE_ENABLED`](https://developers.google.com/google-ads/api/reference/rpc/v21/CampaignErrorEnum.CampaignError#ai_max_must_be_enabled) | New enum value / error | Thrown when opting in to URL expansion text asset automation in Search campaigns without enabling AI Max. |
| Ad group level targeting | New feature | Support added in AI Max for Search campaigns for brand lists, locations, and webpages (URL rules) at the ad group level. |
| [`ai_max_search_term_ad_combination_view`](https://developers.google.com/google-ads/api/fields/v25/ai_max_search_term_ad_combination_view) | New reporting resource | Reports performance on combinations of search terms, headlines, and landing pages. |
| [`search_term_match_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.search_term_match_type) segment | New enum value | Added `AI_MAX` as a search term match type option. |
| Assets |||
| [`PromotionAsset`](https://developers.google.com/google-ads/api/reference/rpc/v21/PromotionAsset) | New fields | Added `terms_and_conditions_text`, `terms_and_conditions_uri`, and oneof `promotion_trigger` options (`promotion_barcode_info`, `promotion_qr_code_info`). See [About promotion assets](https://support.google.com/google-ads/answer/7367521). |
| [`AssetAutomationType.FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION`](https://developers.google.com/google-ads/api/reference/rpc/v21/AssetAutomationTypeEnum.AssetAutomationType#final_url_expansion_text_asset_automation) | New enum value | Added to [`AssetAutomationType`](https://developers.google.com/google-ads/api/reference/rpc/v21/AssetAutomationTypeEnum.AssetAutomationType) to control automated text and landing page generation from final URLs in Search campaigns. |
| [`AutomaticallyCreatedAssetRemovalService.RemoveCampaignAutomaticallyCreatedAsset`](https://developers.google.com/google-ads/api/reference/rpc/v21/AutomaticallyCreatedAssetRemovalService/RemoveCampaignAutomaticallyCreatedAsset) | New service / method | Allows removing automatically created final URL expansion assets from campaigns. |
| [`ServedAssetFieldType.DESCRIPTION_PREFIX`](https://developers.google.com/google-ads/api/reference/rpc/v23/ServedAssetFieldTypeEnum.ServedAssetFieldType) | New enum value | Added to correct a reporting issue where the type was returned as `UNKNOWN` in [`ad_group_ad_asset_combination_view`](https://developers.google.com/google-ads/api/fields/v25/ad_group_ad_asset_combination_view). |
| Campaigns |||
| [`CampaignPrimaryStatusReason.MISSING_LOCATION_TARGETING`](https://developers.google.com/google-ads/api/reference/rpc/v21/CampaignPrimaryStatusReasonEnum.CampaignPrimaryStatusReason) | New enum value | Returned when location-restricted campaigns lack location targeting (which now throws [`LOCATION_TARGETING_NOT_ELIGIBLE_FOR_RESTRICTED_CAMPAIGN`](https://developers.google.com/google-ads/api/reference/rpc/v21/CriterionErrorEnum.CriterionError#location_targeting_not_eligible_for_restricted_campaign) if targeted outside the allowed area). |
| Third-party app analytics integration | New fields | Added support for [`VideoCustomer.third_party_integration_partners`](https://developers.google.com/google-ads/api/reference/rpc/v21/VideoCustomer#third_party_integration_partners) and [`Campaign.third_party_integration_partners`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign#third_party_integration_partners). See [Track app conversions with third-party app analytics](https://support.google.com/google-ads/answer/7382633). |
| [`Campaign.advertising_partner_ids`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign#third_party_integration_partners) | New field support | The field can now be set for existing campaigns (remains immutable after being set). |
| Manager-level negative placements | New feature | Allows exclusions of placement lists across individual advertiser accounts using `CustomerNegativeCriterion`. |
| Tolerance configurations in target ROAS strategies | New fields | Added support for [`TargetRoas.target_roas_tolerance_percent_millis`](https://developers.google.com/google-ads/api/reference/rpc/v21/TargetRoas#target_roas_tolerance_percent_millis) (for Search campaign portfolio strategies) in [`MaximizeConversionValue`](https://developers.google.com/google-ads/api/reference/rpc/v22/MaximizeConversionValue) and [`TargetRoas`](https://developers.google.com/google-ads/api/reference/rpc/v21/TargetRoas). |
| [`LocationInterestView`](https://developers.google.com/google-ads/api/reference/rpc/v21/LocationInterestView) | New reporting resource | Summarizes performance of ad group location interest criteria. |
| Conversions |||
| [`conversion_attribution_event_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.conversion_attribution_event_type) segment | New enum value | Added `ENGAGED_VIEW` to conversion attribution type options. |
| Demand Gen |||
| [`CampaignBudgetError.BUDGET_BELOW_DAILY_MINIMUM`](https://developers.google.com/google-ads/api/reference/rpc/v21/CampaignBudgetErrorEnum.CampaignBudgetError#budget_below_per_day_minimum) | New enum value / error | Added in preparation for enforcing minimum daily budgets for Demand Gen campaigns. Details are exposed using [`budgetDailyMinimumErrorDetails`](https://developers.google.com/google-ads/api/reference/rpc/v21/BudgetPerDayMinimumErrorDetails). |
| Performance Max |||
| [`campaign_search_term_view`](https://developers.google.com/google-ads/api/fields/v25/campaign_search_term_view) | New reporting resource | Aggregates search terms metrics at the campaign level, enabling search term analysis and reporting for Performance Max. |
| Planning |||
| [`ReachPlanService.ListPlannableUserInterests`](https://developers.google.com/google-ads/api/reference/rpc/v21/ReachPlanService/ListPlannableUserInterests) | New method | Allows discovering plannable affinities and in-market interests for [`generateReachForecast`](https://developers.google.com/google-ads/api/reference/rpc/v21/ReachPlanService/GenerateReachForecast). |
| [`AdditionalApplicationInfo`](https://developers.google.com/google-ads/api/reference/rpc/v21/AdditionalApplicationInfo) | New field | Added as an optional input in [`ReachPlanService.ListPlannableUserLists`](https://developers.google.com/google-ads/api/reference/rpc/v21/ReachPlanService/ListPlannableUserLists). |
| AudienceInsights attributes listing | New feature | [`AudienceInsightsService.ListAudienceInsightsAttributes`](https://developers.google.com/google-ads/api/reference/rpc/v21/AudienceInsightsService/ListAudienceInsightsAttributes) now fetches available 1P user lists. |
| AudienceCompositionInsights targeting CRM lists | New feature | [`AudienceInsightsService.GenerateAudienceCompositionInsights`](https://developers.google.com/google-ads/api/reference/rpc/v21/AudienceInsightsService/GenerateAudienceCompositionInsights) now returns user list index details for [`AudienceInsightsDimension`](https://developers.google.com/google-ads/api/reference/rpc/v21/AudienceInsightsDimensionEnum.AudienceInsightsDimension) dimensions: `AGE_RANGE`, `GENDER`, `AFFINITY_USER_INTEREST`, and `IN_MARKET_USER_INTEREST`. |
| [`TrendInsightMetrics`](https://developers.google.com/google-ads/api/reference/rpc/v21/TrendInsightMetrics) audience share | New field | Represents the share of an audience for a trend. |
| [`KnowledgeGraphAttributeMetadata`](https://developers.google.com/google-ads/api/reference/rpc/v21/KnowledgeGraphAttributeMetadata) categories | New fields | Filters Knowledge Graph attributes by matching categories. |
| Reports |||
| Asset views metrics | New features / metrics | Added multiple new metrics to [`AssetGroupAsset`](https://developers.google.com/google-ads/api/fields/v25/asset_group_asset), [`ChannelAggregateAssetView`](https://developers.google.com/google-ads/api/fields/v25/channel_aggregate_asset_view), and [`CampaignAggregateAssetView`](https://developers.google.com/google-ads/api/fields/v25/campaign_aggregate_asset_view). PMax campaigns also now report true values for `impressions`. |
| Selector extensions | New feature | Made [`AssetSet`](https://developers.google.com/google-ads/api/fields/v25/asset_set) and [`CampaignAssetSet`](https://developers.google.com/google-ads/api/fields/v25/campaign_asset_set) queryable together inside [`ChangeStatus`](https://developers.google.com/google-ads/api/fields/v25/change_status). |
| [`search_term_targeting_status`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.search_term_targeting_status) | New segment | Selectable segment in the campaign search term view. |
| [`final_url_expansion_asset_view`](https://developers.google.com/google-ads/api/fields/v25/final_url_expansion_asset_view) | New reporting resource | Reports final URL expansion asset performance details. |
| AssetGroup value adjustments | New fields | Added support for `value_adjustment` and `all_value_adjustment` metrics in the `AssetGroup` report. |
| [`landing_page_source`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.landing_page_source) | New segment | Provides a landing page source segment in [`landing_page_view`](https://developers.google.com/google-ads/api/fields/v25/landing_page_view). |
| [`search_term_match_source`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.search_term_match_source) | New segment | Selectable segment in the search term and campaign search term views. |
| [`match_type`](https://developers.google.com/google-ads/api/fields/v25/segments#segments.match_type) | New segment | Selectable segment key in the keyword view. |
| Unique query intent clusters reporting | New fields | Added [`clicks_unique_query_clusters`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.clicks_unique_query_clusters), [`conversions_unique_query_clusters`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.conversions_unique_query_clusters), and [`impressions_unique_query_clusters`](https://developers.google.com/google-ads/api/fields/v25/metrics#metrics.impressions_unique_query_clusters) to report unique query intent clusters. |
| [`ClickType.VEHICLE_ASSETS`](https://developers.google.com/google-ads/api/reference/rpc/v21/ClickTypeEnum.ClickType#vehicle_assets) | New enum value | Track and report clicks related specifically to vehicle ad formats in the `click_view` report. |
| Smart Bidding Exploration |||
| tolerance configurations in Search strategies | New fields / settings | Allows enabling Smart Bidding Exploration on Search campaigns by setting `target_roas_tolerance_percent_millis` between 10,000 (10%) and 30,000 (30%) inclusive (Maximize Conversions requires `target_roas` setting). See our blog post on [Smart Bidding Exploration](https://blog.google/products/ads-commerce/smart-bidding-exploration-ai/) and help center [article](https://support.google.com/google-ads/answer/15489627). |
| diversity reporting compatibility | New feature | Aggregated [diversity reporting](https://support.google.com/google-ads/answer/16294226) is now supported for the following metrics for unique query intent clusters. A time segmented view is available in the Google Ads UI: - `clicks_unique_query_clusters` - `conversions_unique_query_clusters` - `impressions_unique_query_clusters` |
| Videos |||
| [`YouTubeVideoListAsset`](https://developers.google.com/google-ads/api/reference/rpc/v21/YouTubeVideoListAsset) | New resource / field | Allows establishing links between campaigns and video list assets using [`Asset.youtube_video_list_asset`](https://developers.google.com/google-ads/api/reference/rpc/v21/Asset#youtube_video_list_asset). See [Use related videos](https://support.google.com/google-ads/answer/10464812). |
| Insights metadata extensions | New fields | Added new metadata to [`YouTubeChannelInsights`](https://developers.google.com/google-ads/api/reference/rpc/v23/YouTubeChannelInsights) and [`YouTubeVideoAttributeMetadata`](https://developers.google.com/google-ads/api/reference/rpc/v21/YouTubeVideoAttributeMetadata). |
| Interactive click types | New enum values | Added click types: [`VIDEO_RELATED_VIDEOS_CLICK`](https://developers.google.com/google-ads/api/reference/rpc/v21/ClickTypeEnum.ClickType#video_related_videos_click), [`VIDEO_CHANNEL_CLICK`](https://developers.google.com/google-ads/api/reference/rpc/v21/ClickTypeEnum.ClickType#video_channel_click), and [`PRODUCT_ASSETS`](https://developers.google.com/google-ads/api/reference/rpc/v21/ClickTypeEnum.ClickType#product_assets). |
| [`VideoAdInventoryControl.allow_non_skippable_in_stream`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign.VideoCampaignSettings.VideoAdInventoryControl) | New field | Lets Video Responsive ads serve as non-skippable in-stream ads for campaigns mixing skip and non-skip formats. |
| Video sequencing settings | New fields | Added read-only sequencing configurations: [`Campaign.VideoCampaignSettings.video_ad_sequence`](https://developers.google.com/google-ads/api/reference/rpc/v21/Campaign.VideoCampaignSettings#video_ad_sequence) and [`VideoAdSequenceStepSetting`](https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroup.VideoAdGroupSettings.VideoAdSequenceStepSetting). See [About video ad sequencing](https://support.google.com/google-ads/answer/9161595). |
| Video lineup targeting | New criterion type / field | Added `VIDEO_LINEUP` criterion type and corresponding field in [`CampaignCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v21/CampaignCriterion) and [`AdGroupCriterion`](https://developers.google.com/google-ads/api/reference/rpc/v23/AdGroupCriterion). This feature is only available to accounts on the allowlist. |
| Content suitability placements views | New reporting resources | Added a Content Suitability report for both detail ([`detail_content_suitability_placement_view`](https://developers.google.com/google-ads/api/fields/v25/detail_content_suitability_placement_view)) and group ([`group_content_suitability_placement_view`](https://developers.google.com/google-ads/api/fields/v25/group_content_suitability_placement_view)) levels. See [About the 'Content suitability' report](https://support.google.com/google-ads/answer/16105206). |

## Archived release notes

See [Sunsetted versions](https://developers.google.com/google-ads/api/docs/archived-release-notes) for archived release notes.






