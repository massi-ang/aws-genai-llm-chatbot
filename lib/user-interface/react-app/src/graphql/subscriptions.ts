/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const receiveMessage =
  /* GraphQL */ `subscription ReceiveMessage($sessionId: ID) {
  receiveMessage(sessionId: $sessionId)
}
` as GeneratedSubscription<
    APITypes.ReceiveMessageSubscriptionVariables,
    APITypes.ReceiveMessageSubscription
  >;
