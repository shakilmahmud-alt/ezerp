import { supabase } from '../lib/supabaseClient';

/**
 * Fetch Point Earn Policy and Customer Types map
 */
export async function getPointPolicyAndCustomerTypes() {
  try {
    const [policyRes, ctRes] = await Promise.all([
      supabase.from('point_earn_policy').select('*').limit(1),
      supabase.from('customer_types').select('*')
    ]);

    const globalPolicy = (policyRes.data && policyRes.data.length > 0)
      ? policyRes.data[0]
      : { spend_amount: 100, redeem_point_value: 0, min_redeem_point: 2000 };

    const customerTypesMap = {};
    if (ctRes.data) {
      ctRes.data.forEach(ct => {
        customerTypesMap[ct.id] = ct;
      });
    }

    return {
      globalPolicy,
      customerTypes: ctRes.data || [],
      customerTypesMap
    };
  } catch (err) {
    console.error('Error in getPointPolicyAndCustomerTypes:', err);
    return {
      globalPolicy: { spend_amount: 100, redeem_point_value: 0, min_redeem_point: 2000 },
      customerTypes: [],
      customerTypesMap: {}
    };
  }
}

/**
 * Calculate earned points for a sale amount given customer type and policy
 */
export function calculateEarnedPoints(netAmount, customerTypeId, globalPolicy, customerTypesMap) {
  if (!customerTypeId || !customerTypesMap || !customerTypesMap[customerTypeId]) {
    return 0;
  }
  const ct = customerTypesMap[customerTypeId];
  const rate = Number(ct?.earning_point || 0);
  const spendUnit = Number(globalPolicy?.spend_amount || 100);

  if (rate <= 0 || spendUnit <= 0) return 0;
  const validAmount = Math.max(0, Number(netAmount || 0));
  return Math.floor(validAmount / spendUnit) * rate;
}

/**
 * Get comprehensive points summary map for all customers
 * Returns { [customerId]: { total_earn_point, total_redeem_point, balance_point, earning_rate } }
 */
export async function getAllCustomersPointsMap() {
  try {
    const { globalPolicy, customerTypesMap } = await getPointPolicyAndCustomerTypes();

    // Fetch all customers to get their customer_type_id and basic info
    const { data: customers } = await supabase
      .from('customers')
      .select('id, code, customer_type_id');

    const custTypeByCustId = {};
    if (customers) {
      customers.forEach(c => {
        custTypeByCustId[c.id] = c.customer_type_id;
      });
    }

    // Fetch all completed sales
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('id, invoice_no, customer_id, net_amount, redeem_points, status')
      .not('customer_id', 'is', null);

    const pointsMap = {};

    // Initialize map for all known customers
    if (customers) {
      customers.forEach(c => {
        const ctId = c.customer_type_id;
        const earningPoint = ctId && customerTypesMap[ctId] ? Number(customerTypesMap[ctId].earning_point || 0) : 0;
        pointsMap[c.id] = {
          total_earn_point: 0,
          total_redeem_point: 0,
          balance_point: 0,
          earning_rate: earningPoint,
          spend_unit: Number(globalPolicy.spend_amount || 100)
        };
      });
    }

    if (sales && !salesErr) {
      sales.forEach(s => {
        if (!s.customer_id) return;
        if (s.status && s.status === 'CANCELLED') return;

        if (!pointsMap[s.customer_id]) {
          const ctId = custTypeByCustId[s.customer_id];
          const earningPoint = ctId && customerTypesMap[ctId] ? Number(customerTypesMap[ctId].earning_point || 0) : 0;
          pointsMap[s.customer_id] = {
            total_earn_point: 0,
            total_redeem_point: 0,
            balance_point: 0,
            earning_rate: earningPoint,
            spend_unit: Number(globalPolicy.spend_amount || 100)
          };
        }

        const ctId = custTypeByCustId[s.customer_id];
        const earned = calculateEarnedPoints(s.net_amount, ctId, globalPolicy, customerTypesMap);
        const redeemed = Number(s.redeem_points || 0);

        pointsMap[s.customer_id].total_earn_point += earned;
        pointsMap[s.customer_id].total_redeem_point += redeemed;
      });
    }

    // Compute balance points
    Object.keys(pointsMap).forEach(cId => {
      pointsMap[cId].balance_point = Math.max(
        0,
        pointsMap[cId].total_earn_point - pointsMap[cId].total_redeem_point
      );
    });

    return {
      pointsMap,
      globalPolicy,
      customerTypesMap
    };
  } catch (err) {
    console.error('Error generating customer points map:', err);
    return { pointsMap: {}, globalPolicy: { spend_amount: 100 }, customerTypesMap: {} };
  }
}
