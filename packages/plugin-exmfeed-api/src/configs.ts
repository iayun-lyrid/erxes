import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import { generateModels } from './connectionResolver';
import { initBroker } from './messageBroker';
import { getSubdomain } from '@erxes/api-utils/src/core';
import * as permissions from './permissions';
import cronjobs, {
  createCeremonies,
  sendCeremonyNotification,
} from './cronjobs';

import automations from './automations';
import segments from './segments';
import forms from './forms';
import app from '@erxes/api-utils/src/app';

export let debug;
export let mainDb;

export default {
  name: 'exmfeed',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers: await resolvers(),
    };
  },

  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.subdomain = subdomain;
    context.models = await generateModels(subdomain);

    return context;
  },

  onServerInit: async (options) => {
    mainDb = options.db;

    app.get('/trigger-cron', async (req, res) => {
      const subdomain = getSubdomain(req);

      await createCeremonies(subdomain);
      await sendCeremonyNotification(subdomain);

      return res.send('ok');
    });

    initBroker();

    debug = options.debug;
  },

  meta: { cronjobs, automations, segments, forms },
};
