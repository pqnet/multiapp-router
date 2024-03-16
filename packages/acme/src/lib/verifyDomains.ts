/** @format */
// @ts-check
import { Client, Order } from 'acme-client';
import { prepareChallengeResponse } from './prepareChallengeResponse';
import { DnsUpdater } from '..';

export async function verifyDomains(client: Client, order: Order, dnsUpdaters: DnsUpdater[]) {
  const authorizations = await client.getAuthorizations(order);
  const result = await Promise.all(
    authorizations.map(async (a) => {
      const { challenges } = a;
      let challengeCompleted = false;
      while (!challengeCompleted && challenges.length > 0) {
        const challenge = challenges.pop();
        if (!challenge) {
          break;
        }
        const keyAuthorization =
          await client.getChallengeKeyAuthorization(challenge);
        try {
          await prepareChallengeResponse(a, challenge, keyAuthorization, dnsUpdaters);
        } catch (e) {
          console.warn(e);
          continue;
        }
        await client.verifyChallenge(a, challenge);
        await client.completeChallenge(challenge);
        challengeCompleted = true;
        await client.waitForValidStatus(challenge);
      }
      if (!challengeCompleted) {
        await client.deactivateAuthorization(a);
      }
      return { challengeCompleted, authorization: a };
    }),
  );
  return result;
}
