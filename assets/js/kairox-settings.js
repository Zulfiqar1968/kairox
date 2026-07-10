(function () {
  "use strict";

  window.KairoxSettings = {
    version: "v59",
    brand: {
      name: "Kairox AI",
      assistantName: "Kairox AI Assistant",
      company: "Kairox FZC LLC",
      logoMark: "assets/img/kairox-mark.svg",
      logoLight: "assets/img/kairox-logo-light.svg"
    },
    contact: {
      whatsapp: "+971 52 285 5000",
      whatsappHref: "https://wa.me/971522855000?text=I%20want%20to%20book%20an%20AI%20automation%20consultation%20with%20Kairox",
      email: "kairoxly@gmail.com",
      office: "Amber Gem Tower, Sheikh Khalifa Street, Ajman, UAE"
    },
    webhooks: {
      leads: "https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/leads",
      retellAccessToken: "https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/retell_DV"
    },
    retell: {
      agentId: "agent_5ec6dc37c1772b2f9adc74074b",
      agentVersion: "28",
      sdkUrl: "https://esm.sh/retell-client-js-sdk@2.0.8"
    },
    footer: {
      description: "Kairox FZC LLC builds practical AI employees and automation workflows for UAE SMEs that need faster responses, lower workload and measurable growth.",
      copyright: "© 2026 Kairox FZC LLC. All rights reserved.",
      tagline: "Built for AI automation UAE • AI agents UAE • SME automation solutions"
    },
    navigation: {
      solutions: [
        { label: "All Solutions", href: "solutions.html" },
        { label: "AI Sales Automation", href: "solutions.html#sales" },
        { label: "AI Support Agents", href: "solutions.html#support" },
        { label: "AI Receptionist", href: "solutions.html#receptionist" },
        { label: "Workflow Automation", href: "solutions.html#workflow" },
        { label: "Trainings: Documents & Videos", href: "trainings.html" },
        { label: "Sales Presentations for Prospects", href: "sales-presentations.html" }
      ],
      footerSolutions: [
        { label: "AI Sales Automation", href: "solutions.html#sales" },
        { label: "AI Support Agents", href: "solutions.html#support" },
        { label: "AI Trainings", href: "trainings.html" },
        { label: "Sales Presentations", href: "sales-presentations.html" }
      ]
    },
    features: {
      trainings: {
        title: "Trainings",
        href: "trainings.html",
        items: ["Documents", "Videos"],
        description: "Turn SOPs, FAQs, product guides, policies and videos into structured training assets for AI agents and staff."
      },
      salesPresentations: {
        title: "Sales Presentations for Prospects",
        href: "sales-presentations.html",
        description: "Design prospect-facing presentation pages, pitch decks, objection handling and follow-up assets based on the Kairox value story."
      }
    }
  };

  window.KairoxChatConfig = Object.assign({}, window.KairoxChatConfig || {}, {
    webhook: window.KairoxSettings.webhooks.leads,
    brand: window.KairoxSettings.brand.assistantName,
    logo: window.KairoxSettings.brand.logoMark,
    retellWebCallEndpoint: window.KairoxSettings.webhooks.retellAccessToken,
    retellAgentId: window.KairoxSettings.retell.agentId,
    retellAgentVersion: window.KairoxSettings.retell.agentVersion,
    retellSdkUrl: window.KairoxSettings.retell.sdkUrl
  });
})();
