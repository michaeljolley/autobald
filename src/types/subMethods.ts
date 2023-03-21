import { Field, TigrisDataTypes } from '@tigrisdata/core';
import type { SubMethod, SubMethods as TMISubMethod } from 'tmi.js'

export class SubMethods implements TMISubMethod {

    @Field(TigrisDataTypes.BOOLEAN)
    prime: boolean;
    
    @Field(TigrisDataTypes.STRING)
    plan?: SubMethod;

    @Field(TigrisDataTypes.STRING)
    planName?: string;
}