import React, { useMemo } from 'react';
import { RealProfitGuard } from './RealProfitGuard';
import { SupplierNegotiator } from './SupplierNegotiator';
import { BusinessHealthIndex } from './BusinessHealthIndex';
import { generateRealProfitAnalysis, generateSupplierNegotiationAnalysis, calculateBusinessHealthIndex, generateBusinessInsights, generateAutoStrategies, generateHiddenRisks, generateAILearningInsights } from '../lib/ai-engine';

export const ProfitGuardFeature = ({ data }: { data: any }) => {
 const insights = useMemo(() => generateRealProfitAnalysis(data), [data]);
 return <RealProfitGuard insights={insights} />;
};

export const SupplierNegotiatorFeature = ({ data }: { data: any }) => {
 const insights = useMemo(() => generateSupplierNegotiationAnalysis(data), [data]);
 return <SupplierNegotiator insights={insights} />;
};

export const BusinessHealthFeature = ({ data }: { data: any }) => {
 const health = useMemo(() => calculateBusinessHealthIndex(data), [data]);
 return <BusinessHealthIndex health={health} />;
};

// Also I'll expose hooks or wrappers for the other AI variables so they don't drag down Dashboard mount.
export const useHeavyInsights = (data: any, shouldCompute: boolean) => {
 // We can conditionally compute them by passing empty if not shouldCompute,
 // but the safest way is a separate component.
};
