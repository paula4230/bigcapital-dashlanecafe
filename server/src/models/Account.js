/* eslint-disable global-require */
import { Model } from 'objection';
import { flatten } from 'lodash';
import TenantModel from 'models/TenantModel';
import {
  buildFilterQuery,
  buildSortColumnQuery,
} from 'lib/ViewRolesBuilder';
import { flatToNestedArray } from 'utils';
import DependencyGraph from 'lib/DependencyGraph';

export default class Account extends TenantModel {
  /**
   * Table name
   */
  static get tableName() {
    return 'accounts';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Model modifiers.
   */
  static get modifiers() {
    const TABLE_NAME = Account.tableName;

    return {
      filterAccounts(query, accountIds) {
        if (accountIds.length > 0) {
          query.whereIn(`${TABLE_NAME}.id`, accountIds);
        }
      },
      filterAccountTypes(query, typesIds) {
        if (typesIds.length > 0) {
          query.whereIn('account_types.accoun_type_id', typesIds);
        }
      },
      viewRolesBuilder(query, conditionals, expression) {
        buildFilterQuery(Account.tableName, conditionals, expression)(query);
      },
      sortColumnBuilder(query, columnKey, direction) {
        buildSortColumnQuery(Account.tableName, columnKey, direction)(query);
      },
    };
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const AccountType = require('models/AccountType');
    const AccountTransaction = require('models/AccountTransaction');

    return {
      /**
       * Account model may belongs to account type.
       */
      type: {
        relation: Model.BelongsToOneRelation,
        modelClass: AccountType.default,
        join: {
          from: 'accounts.accountTypeId',
          to: 'account_types.id',
        },
      },

      /**
       * Account model may has many transactions.
       */
      transactions: {
        relation: Model.HasManyRelation,
        modelClass: AccountTransaction.default,
        join: {
          from: 'accounts.id',
          to: 'accounts_transactions.accountId',
        },
      },
    };
  }

  static collectJournalEntries(accounts) {
    return flatten(accounts.map((account) => account.transactions.map((transaction) => ({
      accountId: account.id,
      ...transaction,
      accountNormal: account.type.normal,
    }))));
  }

  /**
   * Converts flatten accounts list to nested array. 
   * @param {Array} accounts 
   * @param {Object} options 
   */
  static toNestedArray(accounts, options = { children: 'children' }) {
    return flatToNestedArray(accounts, { id: 'id', parentId: 'parentAccountId' })
  }

  static toDependencyGraph(accounts) {
    return DependencyGraph.fromArray(
      accounts, { itemId: 'id', parentItemId: 'parentAccountId' }
    );
  }
}
