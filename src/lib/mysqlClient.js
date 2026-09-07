/**
 * EG ERP MySQL REST API Client
 * Drop-in interface compatible with standard database queries
 * Endpoint: https://api.holidaymartbd.com/ezerp/api.php
 */

const API_BASE_URL = 'https://api.holidaymartbd.com/ezerp/api.php';

function matchesPredicate(row, col, op, val) {
  if (!row) return false;
  const rowVal = row[col];

  if (op === 'is') {
    if (val === null || val === 'null') return rowVal === null || rowVal === undefined;
    return rowVal == val;
  }

  if (op === 'not') {
    return !matchesPredicate(row, col, val.op, val.val);
  }

  if (rowVal === null || rowVal === undefined) return false;

  // Date/ISO datetime string comparison
  const isDatePattern = /^\d{4}-\d{2}-\d{2}/;
  const isValDate = typeof val === 'string' && isDatePattern.test(val);
  const isRowDate = typeof rowVal === 'string' && isDatePattern.test(rowVal);

  if (isValDate && isRowDate) {
    const rowD = String(rowVal).slice(0, 10);
    const valD = String(val).slice(0, 10);
    if (op === 'eq') return rowD === valD;
    if (op === 'neq') return rowD !== valD;
    if (op === 'gte') return rowD >= valD;
    if (op === 'lte') return rowD <= valD;
    if (op === 'gt') return rowD > valD;
    if (op === 'lt') return rowD < valD;
  }

  // Numeric comparison
  const numRow = Number(rowVal);
  const numVal = Number(val);
  const isNumeric = !isNaN(numRow) && !isNaN(numVal) && typeof val !== 'boolean' && typeof rowVal !== 'boolean' && String(val).trim() !== '' && String(rowVal).trim() !== '';

  if (isNumeric) {
    if (op === 'eq') return numRow === numVal;
    if (op === 'neq') return numRow !== numVal;
    if (op === 'gte') return numRow >= numVal;
    if (op === 'lte') return numRow <= numVal;
    if (op === 'gt') return numRow > numVal;
    if (op === 'lt') return numRow < numVal;
  }

  // String / Text comparison
  const strRow = String(rowVal).toLowerCase();
  const strVal = String(val).toLowerCase();

  if (op === 'eq') return strRow === strVal;
  if (op === 'neq') return strRow !== strVal;
  if (op === 'gte') return strRow >= strVal;
  if (op === 'lte') return strRow <= strVal;
  if (op === 'gt') return strRow > strVal;
  if (op === 'lt') return strRow < strVal;
  if (op === 'like') {
    const clean = strVal.replace(/^%+|%+$/g, '');
    return strRow.includes(clean);
  }
  if (op === 'in') {
    const list = Array.isArray(val) ? val.map(v => String(v).toLowerCase()) : String(val).toLowerCase().split(',').map(s => s.trim());
    return list.includes(strRow);
  }

  return true;
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectCols = '*';
    this.filters = [];
    this.filterPredicates = [];
    this.orConditions = [];
    this.orderBy = '';
    this.limitVal = null;
    this.offsetVal = null;
    this.isCountExact = false;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.action = 'SELECT';
    this.payload = null;
    this.onConflict = 'id';
  }

  select(columns = '*', options = {}) {
    // Preserve action if it's already an INSERT, UPSERT, or UPDATE
    if (this.action !== 'INSERT' && this.action !== 'UPSERT' && this.action !== 'UPDATE') {
      this.action = 'SELECT';
    }
    this.selectCols = columns;
    if (options && options.count === 'exact') {
      this.isCountExact = true;
    }
    return this;
  }

  insert(data) {
    this.action = 'INSERT';
    this.payload = data;
    return this;
  }

  upsert(data, options = {}) {
    this.action = 'UPSERT';
    this.payload = data;
    if (options && options.onConflict) {
      this.onConflict = options.onConflict;
    }
    return this;
  }

  update(data) {
    this.action = 'UPDATE';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'DELETE';
    return this;
  }

  eq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'eq', value });
    return this;
  }

  neq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=neq.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'neq', value });
    return this;
  }

  gt(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=gt.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'gt', value });
    return this;
  }

  gte(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=gte.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'gte', value });
    return this;
  }

  lt(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=lt.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'lt', value });
    return this;
  }

  lte(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=lte.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'lte', value });
    return this;
  }

  like(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=like.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'like', value });
    return this;
  }

  ilike(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=like.${encodeURIComponent(value)}`);
    this.filterPredicates.push({ column, op: 'like', value });
    return this;
  }

  is(column, value) {
    if (value === null) {
      this.filters.push(`${encodeURIComponent(column)}=is.null`);
      this.filterPredicates.push({ column, op: 'is', value: null });
    } else {
      this.filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
      this.filterPredicates.push({ column, op: 'eq', value });
    }
    return this;
  }

  not(column, operator, value) {
    if (operator === 'in') {
      const list = Array.isArray(value) ? value.join(',') : String(value).replace(/[()]/g, '');
      this.filters.push(`${encodeURIComponent(column)}=not.in.(${encodeURIComponent(list)})`);
      this.filterPredicates.push({ column, op: 'not', value: { op: 'in', val: value } });
    } else if (operator === 'is' && value === null) {
      this.filters.push(`${encodeURIComponent(column)}=not.is.null`);
      this.filterPredicates.push({ column, op: 'not', value: { op: 'is', val: null } });
    } else if (operator === 'eq') {
      this.filters.push(`${encodeURIComponent(column)}=neq.${encodeURIComponent(value)}`);
      this.filterPredicates.push({ column, op: 'neq', value });
    } else {
      this.filters.push(`${encodeURIComponent(column)}=neq.${encodeURIComponent(value)}`);
      this.filterPredicates.push({ column, op: 'neq', value });
    }
    return this;
  }

  in(column, values) {
    const list = Array.isArray(values) ? values.join(',') : String(values).replace(/[()]/g, '');
    this.filters.push(`${encodeURIComponent(column)}=in.(${encodeURIComponent(list)})`);
    this.filterPredicates.push({ column, op: 'in', value: values });
    return this;
  }

  or(filters) {
    if (filters) {
      this.orConditions.push(filters);
    }
    return this;
  }

  order(column, { ascending = true } = {}) {
    const dir = ascending ? 'asc' : 'desc';
    this.orderBy = `${column}.${dir}`;
    return this;
  }

  limit(count) {
    this.limitVal = count;
    return this;
  }

  range(from, to) {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Promise execution interface (supports async / await / .then)
  async then(resolve, reject) {
    try {
      // Handle SELECT queries with OR conditions via parallel sub-queries
      if (this.action === 'SELECT' && this.orConditions.length > 0) {
        const parts = this.orConditions.flatMap(str => str.split(',').map(s => s.trim()).filter(Boolean));
        const promises = parts.map(async part => {
          const firstDot = part.indexOf('.');
          if (firstDot === -1) return [];
          const col = part.slice(0, firstDot);
          let opVal = part.slice(firstDot + 1);
          if (opVal.startsWith('ilike.')) opVal = 'like.' + opVal.slice(6);
          
          let subUrl = `${API_BASE_URL}?table=${encodeURIComponent(this.table)}`;
          if (this.selectCols && this.selectCols !== '*') {
            const cleanCols = this.selectCols.replace(/\b\w+:\w+\([^)]*\)/g, '').replace(/\b\w+\([^)]*\)/g, '').replace(/,,+/g, ',').replace(/^,|,$/g, '').trim() || '*';
            if (cleanCols !== '*') subUrl += `&select=${encodeURIComponent(cleanCols)}`;
          }
          if (this.filters.length > 0) {
            subUrl += '&' + this.filters.join('&');
          }
          subUrl += `&${encodeURIComponent(col)}=${encodeURIComponent(opVal)}`;
          if (this.limitVal !== null) {
            subUrl += `&limit=${this.limitVal}`;
          }

          try {
            const res = await fetch(subUrl, { headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) return [];
            const json = await res.json();
            return Array.isArray(json) ? json : (json && json.id ? [json] : []);
          } catch {
            return [];
          }
        });

        const allArrays = await Promise.all(promises);
        const seen = new Set();
        const merged = [];
        allArrays.flat().forEach(item => {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          } else if (item && !item.id) {
            merged.push(item);
          }
        });

        let data = merged;
        if (this.limitVal !== null) {
          data = data.slice(0, this.limitVal);
        }
        if (this.isSingle || this.isMaybeSingle) {
          data = data[0] || null;
        }

        return resolve({ data, error: null, count: merged.length });
      }
      let url = `${API_BASE_URL}?table=${encodeURIComponent(this.table)}`;

      if (this.selectCols && this.selectCols !== '*') {
        url += `&select=${encodeURIComponent(this.selectCols)}`;
      }

      if (this.filters.length > 0) {
        url += '&' + this.filters.join('&');
      }

      if (this.orderBy) {
        url += `&order=${encodeURIComponent(this.orderBy)}`;
      }

      if (this.limitVal !== null) {
        url += `&limit=${this.limitVal}`;
      }

      if (this.offsetVal !== null) {
        url += `&offset=${this.offsetVal}`;
      }

      if (this.isCountExact) {
        url += '&count=exact';
      }

      let fetchOptions = {
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (this.action === 'INSERT') {
        fetchOptions.method = 'POST';
        fetchOptions.body = JSON.stringify(this.payload);
      } else if (this.action === 'UPSERT') {
        fetchOptions.method = 'POST';
        url += `&action=upsert&on_conflict=${encodeURIComponent(this.onConflict)}`;
        fetchOptions.body = JSON.stringify(this.payload);
      } else if (this.action === 'UPDATE') {
        fetchOptions.method = 'PUT';
        fetchOptions.body = JSON.stringify(this.payload);
      } else if (this.action === 'DELETE') {
        fetchOptions.method = 'DELETE';
      } else {
        fetchOptions.method = 'GET';
      }

      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        const errText = await response.text();
        const errObj = { message: errText || `HTTP Error ${response.status}` };
        return resolve({ data: null, error: errObj, count: null });
      }

      const json = await response.json();

      let data = null;
      let count = null;

      if (json && json.status === 'error') {
        return resolve({ data: null, error: { message: json.message }, count: null });
      }

      if (this.isCountExact && json && json.data !== undefined) {
        data = json.data;
        count = json.count;
      } else {
        data = json;
      }

      // Client-side predicate enforcement
      if (Array.isArray(data) && this.filterPredicates.length > 0) {
        data = data.filter(row => {
          return this.filterPredicates.every(p => matchesPredicate(row, p.column, p.op, p.value));
        });
      }

      if (this.isSingle) {
        data = Array.isArray(data) ? (data[0] || null) : (data || null);
      } else if (this.isMaybeSingle) {
        data = Array.isArray(data) ? (data[0] || null) : (data || null);
      }

      return resolve({ data, error: null, count: this.isCountExact ? (count !== null ? count : (Array.isArray(data) ? data.length : 1)) : null });
    } catch (err) {
      console.error('MySQL API Query Error:', err);
      return resolve({ data: null, error: { message: err.message }, count: null });
    }
  }
}

class MySqlClient {
  from(table) {
    return new QueryBuilder(table);
  }

  async rpc(procedureName, params = {}) {
    try {
      const url = `${API_BASE_URL}?action=rpc&name=${encodeURIComponent(procedureName)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

export const mysqlClient = new MySqlClient();
