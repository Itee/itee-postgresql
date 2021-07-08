console.log('Itee.Database.PostgreSQL v1.0.2 - EsModule')
import { TAbstractDatabase, TAbstractDataController } from 'itee-database';
import { isDefined, isNull, isUndefined, isNotString } from 'itee-validators';
import PostgreSQL from 'pg-promise';

/**
 * @author [Ahmed DCHAR]{@link https://github.com/dragoneel}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

//const PostgreSQLDriver = PostgreSQL( {} )

class TPostgreSQLDatabase extends TAbstractDatabase {

    static formatConnectionString ( parameters ) {

        let connectionString                           = '';
        const { user, password, host, port, database } = parameters;

        if ( isDefined( user ) && isDefined( password ) ) {
            connectionString = `postgres://${ user }:${ password }@${ host }:${ port }/${ database }`;
        } else {
            connectionString = `postgres://${ host }:${ port }/${ database }`;
        }

        return connectionString

    }

    constructor ( parameters = {} ) {


        const _parameters = {
            ...{
                host:     'localhost',
                port:     '5432',
                database: 'postgres'
            },
            ...parameters,
            ...{
                driver: PostgreSQL( {} )( TPostgreSQLDatabase.formatConnectionString( parameters ) )
            }
        };

        super( _parameters );

        this._user     = _parameters.user;
        this._password = _parameters.password;
        this._host     = _parameters.host;
        this._port     = _parameters.port;
        this._database = _parameters.database;

    }

    init () {
        super.init();

    }

    connect () {

        this.driver.one( ` SELECT 1 `, [] )
            .then( () => {
                this.logger.log( `PostgreSQL at postgres://${ this._host }:${ this._port }/${ this._database } is connected !` );
            } )
            .catch( ( error ) => {
                this.logger.log( 'PostgreSQL - Connection error ', error );
            } );

    }

    on ( /*eventName, callback*/ ) {}

    close ( onCloseCallback ) {

        this.driver.end();
        onCloseCallback();

    }

}

class TPostgreSQLController extends TAbstractDataController {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                driver:      null,
                tableName:   '',
                tableFields: []
            }, ...parameters
        };

        super( _parameters );

        this.tableName   = _parameters.tableName;
        this.tableFields = _parameters.tableFields;

    }

    get tableFields () {

        return this._tableFields

    }

    set tableFields ( value ) {

        const valueName = 'Table fields';
        const expect    = 'Expect an instance of Array of String.';

        if ( isNull( value ) ) { throw new TypeError( `${valueName} cannot be null ! ${expect}` ) }
        if ( isUndefined( value ) ) { throw new TypeError( `${valueName} cannot be undefined ! ${expect}` ) }

        let fields = '';
        for ( let fieldIndex = 0, numberOfFileds = value.length ; fieldIndex < numberOfFileds ; fieldIndex++ ) {
            fields += `${value[ fieldIndex ]}, `;
        }

        this._tableFields = fields.slice( 0, -2 );

    }

    get tableName () {
        return this._tableName
    }

    set tableName ( value ) {

        const valueName = 'Table name';
        const expect    = 'Expect an instance of String.';

        if ( isNull( value ) ) { throw new TypeError( `${valueName} cannot be null ! ${expect}` ) }
        if ( isUndefined( value ) ) { throw new TypeError( `${valueName} cannot be undefined ! ${expect}` ) }
        if ( isNotString( value ) ) { throw new TypeError( `${valueName} cannot be an instance of ${value.constructor.name} ! ${expect}` ) }

        this._tableName = value;

    }

    setTableName ( value ) {

        this.tableName = value;
        return this

    }

    _createMany ( datas, response ) {
        super._createOne( datas, response );

        const _datas      = [];
        const _errors     = [];
        let numberOfDatas = datas.length;
        let data          = null;
        let dataKeys      = null;
        let dataValues    = null;
        let counter       = null;
        let parameters    = null;
        let values        = null;
        let query         = null;

        for ( let subDataKey in datas ) {

            data       = datas[ subDataKey ];
            dataKeys   = Object.keys( data );
            dataValues = Object.values( data );
            counter    = 0;
            parameters = '(';
            values     = '(';
            for ( let key in dataKeys ) {
                counter++;
                parameters += `${key}, `;
                values += `$${counter}, `;
            }
            parameters = parameters.slice( 0, -2 );
            values     = values.slice( 0, -2 );
            parameters += ')';
            values += ')';

            query = `INSERT INTO ${this._tableName} ${parameters} VALUES ${values}`;

            this._driver
                .one( query, dataValues )
                .then( data => {
                    _datas.push( data );
                } )
                .catch( error => {
                    _errors.push( error );
                } )
                .finally( () => {

                    numberOfDatas--;
                    if ( numberOfDatas > 0 ) { return }

                    const haveData  = ( _datas.length > 0 );
                    const haveError = ( _errors.length > 0 );

                    if ( haveData && haveError ) {

                        TAbstractDataController.returnErrorAndData( _errors, _datas, response );

                    } else if ( !haveData && haveError ) {

                        TAbstractDataController.returnError( _errors, response );

                    } else if ( haveData && !haveError ) {

                        TAbstractDataController.returnData( _datas, response );

                    } else if ( !haveData && !haveError ) {

                        TAbstractDataController.returnData( null, response );

                    }

                } );

        }

    }

    _createOne ( data, response ) {
        super._createOne( data, response );

        const dataKeys   = Object.keys( data );
        const dataValues = Object.values( data );
        let counter      = 0;
        let parameters   = '(';
        let values       = '(';
        for ( let key in dataKeys ) {
            counter++;
            parameters += `${key}, `;
            values += `$${counter}, `;
        }
        parameters = parameters.slice( 0, -2 );
        values     = values.slice( 0, -2 );
        parameters += ')';
        values += ')';

        let query = `INSERT INTO ${this._tableName} ${parameters} VALUES ${values}`;

        this._driver
            .one( query, dataValues )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _deleteAll ( response ) {
        super._deleteAll( response );

        this._driver
            .one( ` TRUNCATE TABLE ${this._tableName} ` )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _deleteMany ( ids, response ) {
        super._deleteMany( ids, response );

        this._driver
            .any( ` DELETE FROM ${this._tableName} WHERE id IN ($1:list) `, [ ids ] )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _deleteOne ( id, response ) {
        super._deleteOne( id, response );

        this._driver
            .one( ` DELETE FROM ${this._tableName} WHERE id=$1 `, [ id ] )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _deleteWhere ( query, response ) {
        super._deleteWhere( query, response );

        TAbstractDataController.returnError( 'DeleteWhere method is not implemented yet ! Sorry for the disagrement.', response );

    }

    _readAll ( projection, response ) {
        super._readAll( projection, response );

        this._driver
            .any( ` SELECT ${this._tableFields} FROM ${this._tableName} ` )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _readMany ( ids, projection, response ) {
        super._readMany( ids, projection, response );

        this._driver
            .any( ` SELECT ${this._tableFields} FROM ${this._tableName} WHERE id IN ($1:list)`, [ ids ] )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _readOne ( id, projection, response ) {
        super._readOne( id, projection, response );

        this._driver
            .one( ` SELECT ${this._tableFields} FROM ${this._tableName} WHERE id = $1 `, [ id ] )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _readWhere ( query, projection, response ) {
        super._readWhere( query, projection, response );

        this._driver
            .any( ` SELECT ${this._tableFields} FROM ${this._tableName} WHERE ${projection}` )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );
    }

    _updateAll ( update, response ) {
        super._updateAll( update, response );

        TAbstractDataController.returnError( 'UpdateAll method is not implemented yet ! Sorry for the disagrement.', response );

    }

    _updateMany ( ids, updates, response ) {
        super._updateMany( ids, updates, response );

        const numberOfIds     = ids.length;
        const numberOfUpdates = updates.length;

        if ( numberOfIds !== numberOfUpdates ) {
            TAbstractDataController.returnError( 'Number of ids doesn\'t match the number of updates. Abort updates !', response );
            return
        }

        const _datas      = [];
        const _errors     = [];
        let numberOfDatas = numberOfIds;
        let id            = null;
        let update        = null;
        let updateKeys    = null;
        let updateValues  = null;
        let counter       = null;
        let settings      = null;
        let query         = null;
        let dataToSend    = null;

        for ( let index = 0 ; index < numberOfUpdates ; index++ ) {

            id           = ids[ index ];
            update       = updates[ index ];
            updateKeys   = Object.keys( update );
            updateValues = Object.values( update );
            counter      = 1;
            settings     = '';
            for ( let key in updateKeys ) {
                counter++;
                settings += `${key}=$${counter}, `;
            }
            settings = settings.slice( 0, -2 );
            settings += ')';

            query      = ` UPDATE ${this._tableName} SET ${settings} WHERE id=$1 `;
            dataToSend = [ id ].concat( updateValues );

            this._driver
                .one( query, dataToSend )
                .then( data => {
                    _datas.push( data );
                } )
                .catch( error => {
                    _errors.push( error );
                } )
                .finally( () => {

                    numberOfDatas--;
                    if ( numberOfDatas > 0 ) { return }

                    const haveData  = ( _datas.length > 0 );
                    const haveError = ( _errors.length > 0 );

                    if ( haveData && haveError ) {

                        TAbstractDataController.returnErrorAndData( _errors, _datas, response );

                    } else if ( !haveData && haveError ) {

                        TAbstractDataController.returnError( _errors, response );

                    } else if ( haveData && !haveError ) {

                        TAbstractDataController.returnData( _datas, response );

                    } else if ( !haveData && !haveError ) {

                        TAbstractDataController.returnData( null, response );

                    }

                } );

        }

    }

    _updateOne ( id, update, response ) {
        super._updateOne( id, update, response );

        const dataKeys   = Object.keys( update );
        const dataValues = Object.values( update );
        let counter      = 1;
        let settings     = '';
        for ( let key in dataKeys ) {
            counter++;
            settings += `${key}=$${counter}, `;
        }
        settings = settings.slice( 0, -2 );
        settings += ')';

        let query   = ` UPDATE ${this._tableName} SET ${settings} WHERE id=$1 `;
        let updates = [ id ].concat( dataValues );

        this._driver
            .one( query, updates )
            .then( data => {
                TAbstractDataController.returnData( data, response );
            } )
            .catch( error => {
                TAbstractDataController.returnError( error, response );
            } );

    }

    _updateWhere ( query, update, response ) {
        super._updateWhere( query, update, response );

        TAbstractDataController.returnError( 'UpdateWhere method is not implemented yet ! Sorry for the disagrement.', response );

    }

    /// UTILS

}

export { TPostgreSQLController, TPostgreSQLDatabase };
//# sourceMappingURL=itee-postgresql.esm.js.map
