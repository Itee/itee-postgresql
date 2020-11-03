/**
 * @author [Ahmed DCHAR]{@link https://github.com/dragoneel}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

import { TAbstractDatabase } from 'itee-database'
import { isDefined }         from 'itee-validators'
import PostgreSQL            from 'pg-promise'

//const PostgreSQLDriver = PostgreSQL( {} )

class TPostgreSQLDatabase extends TAbstractDatabase {

    static formatConnectionString ( parameters ) {

        let connectionString                           = ''
        const { user, password, host, port, database } = parameters

        if ( isDefined( user ) && isDefined( password ) ) {
            connectionString = `postgres://${ user }:${ password }@${ host }:${ port }/${ database }`
        } else {
            connectionString = `postgres://${ host }:${ port }/${ database }`
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
        }

        super( _parameters )

        this._user     = _parameters.user
        this._password = _parameters.password
        this._host     = _parameters.host
        this._port     = _parameters.port
        this._database = _parameters.database

    }

    init () {
        super.init()

    }

    connect () {

        this.driver.one( ` SELECT 1 `, [] )
            .then( () => {
                console.log( `PostgreSQL at postgres://${ this._host }:${ this._port }/${ this._database } is connected !` )
            } )
            .catch( ( error ) => {
                console.log( 'PostgreSQL - Connection error ', error )
            } )

    }

    on ( /*eventName, callback*/ ) {}

    close ( onCloseCallback ) {

        this.driver.end()
        onCloseCallback()

    }

}

export { TPostgreSQLDatabase }
