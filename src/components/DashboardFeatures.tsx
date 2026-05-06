import React, { useMemo } from 'react';
import { RealProfitGuard } from './RealProfitGuard';
import { SupplierNegotiator } from './SupplierNegotiator';
import { WhatIfSimulator } from './WhatIfSimulator';
import { SmartOffersCalculator } from './SmartOffersCalculator';
import { FutureForecast } from './FutureForecast';
import { BusinessHealthIndex } from './BusinessHealthIndex';
import { MarketingLab } from './MarketingLab';
import { generateRealProfitAnalysis, generateSupplierNegotiationAnalysis, calculateBusinessHealthIndex } from '../lib/ai-engine';

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
