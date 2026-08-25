/**
 * EG ERP MySQL REST API Client
 * Drop-in interface compatible with standard database queries
 * Endpoint: https://api.holidaymartbd.com/ezerp/api.php
 */

const API_BASE_URL = 'https://api.holidaymartbd.com/ezerp/api.php';

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectCols = '*';
    this.filters = [];
    this.orderBy = '';
    this.limitVal = null;
    this.offsetVal = null;
    this.isCountExact = false;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.action = 'SELECT';
    this.payload = null;
  }

  select(columns = '*', options = {}) {
    this.action = 'SELECT';
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
    return this;
  }

  neq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  gt(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=gt.${encodeURIComponent(value)}`);
    return this;
  }

  gte(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=gte.${encodeURIComponent(value)}`);
    return this;
  }

  lt(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=lt.${encodeURIComponent(value)}`);
    return this;
  }

  lte(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=lte.${encodeURIComponent(value)}`);
    return this;
  }

  like(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=like.${encodeURIComponent(value)}`);
    return this;
  }

  ilike(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=ilike.${encodeURIComponent(value)}`);
    return this;
  }

  in(column, values) {
    const list = Array.isArray(values) ? values.join(',') : values;
    this.filters.push(`${encodeURIComponent(column)}=in.(${encodeURIComponent(list)})`);
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

      if (this.isSingle) {
        data = Array.isArray(data) ? (data[0] || null) : data;
      } else if (this.isMaybeSingle) {
        data = Array.isArray(data) ? (data[0] || null) : data;
      }

      return resolve({ data, error: null, count });
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
