console.log('Itee.Database.PostgreSQL v1.0.0 - CommonJs')
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var PostgreSQL = _interopDefault(require('pg-promise'));
var iteeValidators = require('itee-validators');
var path = _interopDefault(require('path'));
var buffer = require('buffer');
var fs = _interopDefault(require('fs'));
var stream = require('stream');

console.log('Itee.Database v8.0.0 - EsModule');

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @class TDatabaseController
 * @classdesc The TDatabaseController is the base class to perform CRUD operations on the database
 */

class TAbstractDataController {

    /**
     * Check if requested params named 'dataName' exist in request.body, request.params or request.query
     *
     * @param dataName - The property name to looking for
     * @param request - The _server request
     * @param response - The _server response
     * @returns {*} - Return the property or return error to the end user if the property doesn't exist
     * @private
     */
    static __checkData ( dataName, request, response ) {

        const body   = request.body;
        const params = request.params;
        const query  = request.query;

        if ( iteeValidators.isDefined( body ) && body[ dataName ] ) {

            return body[ dataName ]

        } else if ( iteeValidators.isDefined( params ) && params[ dataName ] ) {

            return params[ dataName ]

        } else if ( iteeValidators.isDefined( query ) && query[ dataName ] ) {

            return query[ dataName ]

        } else {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: `${dataName} n'existe pas dans les paramètres !`
            }, response );

        }
    }

    /**
     * Normalize error that can be in different format like single string, object, array of string, or array of object.
     *
     * @example <caption>Normalized error are simple literal object like:</caption>
     * {
     *     title: 'error',
     *     message: 'the error message'
     * }
     *
     * @param {String|Object|Array.<String>|Array.<Object>} error - The error object to normalize
     * @returns {Array.<Object>}
     * @private
     */
    static _formatError ( error ) {
        let errorsList = [];

        if ( iteeValidators.isArray( error ) ) {

            for ( let i = 0, l = error.length ; i < l ; ++i ) {
                errorsList = errorsList.concat( TAbstractDataController._formatError( error[ i ] ) );
            }

        } else if ( iteeValidators.isObject( error ) ) {

            if ( error.name === 'ValidationError' ) {

                let _message  = '';
                let subsError = error.errors;

                for ( let property in subsError ) {
                    if ( !Object.prototype.hasOwnProperty.call( subsError, property ) ) { continue }
                    _message += subsError[ property ].message + '<br>';
                }

                errorsList.push( {
                    title:   'Erreur de validation',
                    message: _message || 'Aucun message d\'erreur... Gloups !'
                } );

            } else if ( error.name === 'VersionError' ) {

                errorsList.push( {
                    title:   'Erreur de base de donnée',
                    message: 'Aucun document correspondant n\'as put être trouvé pour la requete !'
                } );

            } else {

                errorsList.push( {
                    title:   error.title || 'Erreur',
                    message: error.message || 'Aucun message d\'erreur... Gloups !'
                } );

            }

        } else if ( iteeValidators.isString( error ) ) {

            errorsList.push( {
                title:   'Erreur',
                message: error
            } );

        } else {

            throw new Error( `Unknown error type: ${error} !` )

        }

        return errorsList

    }

    /**
     * In case database call return nothing consider that is a not found.
     * If response parameter is a function consider this is a returnNotFound callback function to call,
     * else check if server response headers aren't send yet, and return response with status 204
     *
     * @param response - The server response or returnNotFound callback
     * @returns {*} callback call or response with status 204
     */
    static returnNotFound ( response ) {

        if ( iteeValidators.isFunction( response ) ) { return response() }
        if ( response.headersSent ) { return }

        response.status( 204 ).end();

    }

    /**
     * In case database call return an error.
     * If response parameter is a function consider this is a returnError callback function to call,
     * else check if server response headers aren't send yet, log and flush stack trace (if allowed) and return response with status 500 and
     * stringified error as content
     *
     * @param error - A server/database error
     * @param response - The server response or returnError callback
     * @returns {*} callback call or response with status 500 and associated error
     */
    static returnError ( error, response ) {

        if ( iteeValidators.isFunction( response ) ) { return response( error, null ) }
        if ( response.headersSent ) { return }

        const formatedError = TAbstractDataController._formatError( error );

        response.format( {

            'application/json': () => {
                response.status( 500 ).json( formatedError );
            },

            'default': () => {
                response.status( 406 ).send( 'Not Acceptable' );
            }

        } );

    }

    /**
     * In case database call return some data.
     * If response parameter is a function consider this is a returnData callback function to call,
     * else check if server response headers aren't send yet, and return response with status 200 and
     * stringified data as content
     *
     * @param data - The server/database data
     * @param response - The server response or returnData callback
     * @returns {*} callback call or response with status 200 and associated data
     */
    static returnData ( data, response ) {

        if ( iteeValidators.isFunction( response ) ) { return response( null, data ) }
        if ( response.headersSent ) { return }

        const _data = iteeValidators.isArray( data ) ? data : [ data ];

        response.format( {

            'application/json': () => {
                response.status( 200 ).json( _data );
            },

            'default': () => {
                response.status( 406 ).send( 'Not Acceptable' );
            }

        } );

    }

    /**
     * In case database call return some data AND error.
     * If response parameter is a function consider this is a returnErrorAndData callback function to call,
     * else check if server response headers aren't send yet, log and flush stack trace (if allowed) and
     * return response with status 406 with stringified data and error in a literal object as content
     *
     * @param error - A server/database error
     * @param data - The server/database data
     * @param response - The server response or returnErrorAndData callback
     * @returns {*} callback call or response with status 406, associated error and data
     */
    static returnErrorAndData ( error, data, response ) {

        if ( iteeValidators.isFunction( response ) ) { return response( error, data ) }
        if ( response.headersSent ) { return }

        const result = {
            errors: error,
            datas:  data
        };

        response.format( {

            'application/json': () => {
                response.status( 416 ).json( result );
            },

            'default': () => {
                response.status( 416 ).send( 'Range Not Satisfiable' );
            }

        } );

    }

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                driver:  null,
                useNext: false
            }, ...parameters
        };

        this._driver  = _parameters.driver;
        this._useNext = _parameters.useNext;

    }

    return ( response, callbacks = {} ) {

        const _callbacks = Object.assign( {

                immediate:                null,
                beforeAll:                null,
                beforeReturnErrorAndData: null,
                afterReturnErrorAndData:  null,
                beforeReturnError:        null,
                afterReturnError:         null,
                beforeReturnData:         null,
                afterReturnData:          null,
                beforeReturnNotFound:     null,
                afterReturnNotFound:      null,
                afterAll:                 null

            },
            callbacks,
            {
                returnErrorAndData: TAbstractDataController.returnErrorAndData.bind( this ),
                returnError:        TAbstractDataController.returnError.bind( this ),
                returnData:         TAbstractDataController.returnData.bind( this ),
                returnNotFound:     TAbstractDataController.returnNotFound.bind( this )
            } );

        /**
         * The callback that will be used for parse database response
         */
        function dispatchResult ( error = null, data = null ) {

            const haveData  = iteeValidators.isDefined( data );
            const haveError = iteeValidators.isDefined( error );

            if ( _callbacks.beforeAll ) { _callbacks.beforeAll(); }

            if ( haveData && haveError ) {

                if ( _callbacks.beforeReturnErrorAndData ) { _callbacks.beforeReturnErrorAndData( error, data ); }
                _callbacks.returnErrorAndData( error, data, response );
                if ( _callbacks.afterReturnErrorAndData ) { _callbacks.afterReturnErrorAndData( error, data ); }

            } else if ( haveData && !haveError ) {

                if ( _callbacks.beforeReturnData ) { _callbacks.beforeReturnData( data ); }
                _callbacks.returnData( data, response );
                if ( _callbacks.afterReturnData ) { _callbacks.afterReturnData( data ); }

            } else if ( !haveData && haveError ) {

                if ( _callbacks.beforeReturnError ) { _callbacks.beforeReturnError( error ); }
                _callbacks.returnError( error, response );
                if ( _callbacks.afterReturnError ) { _callbacks.afterReturnError( error ); }

            } else if ( !haveData && !haveError ) {

                if ( _callbacks.beforeReturnNotFound ) { _callbacks.beforeReturnNotFound(); }
                _callbacks.returnNotFound( response );
                if ( _callbacks.afterReturnNotFound ) { _callbacks.afterReturnNotFound(); }

            }

            if ( _callbacks.afterAll ) { _callbacks.afterAll(); }

        }

        // An immediate callback hook ( for timing for example )
        if ( _callbacks.immediate ) { _callbacks.immediate(); }

        return dispatchResult

    }

    //////////////////
    // CRUD Methods //
    //////////////////

    create ( request, response, next ) {

        const data = request.body;

        if ( iteeValidators.isNotDefined( data ) ) {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'Le corps de la requete ne peut pas être null ou indefini.'
            }, ( this._useNext ) ? next : response );

        } else if ( iteeValidators.isArray( data ) ) {

            if ( iteeValidators.isEmptyArray( data ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'objet de la requete ne peut pas être vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._createMany( data, response, next );

            }

        } else if ( iteeValidators.isObject( data ) ) {

            if ( iteeValidators.isEmptyObject( data ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'objet de la requete ne peut pas être vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._createOne( data, response, next );

            }

        } else {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'Le type de donnée de la requete est invalide. Les paramètres valides sont objet ou un tableau d\'objet.'
            }, ( this._useNext ) ? next : response );

        }

    }

    _createOne ( /*data, response, next*/ ) {}

    _createMany ( /*datas, response, next*/ ) {}

    read ( request, response, next ) {

        const id          = request.params[ 'id' ];
        const requestBody = request.body;
        const haveBody    = ( iteeValidators.isDefined( requestBody ) );
        const ids         = ( haveBody ) ? requestBody.ids : null;
        const query       = ( haveBody ) ? requestBody.query : null;
        const projection  = ( haveBody ) ? requestBody.projection : null;

        if ( iteeValidators.isDefined( id ) ) {

            if ( iteeValidators.isNotString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant devrait être une chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyString( id ) || iteeValidators.isBlankString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant ne peut pas être une chaine de caractères vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._readOne( id, projection, response, next );

            }

        } else if ( iteeValidators.isDefined( ids ) ) {

            if ( iteeValidators.isNotArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants devrait être un tableau de chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants ne peut pas être vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._readMany( ids, projection, response, next );

            }

        } else if ( iteeValidators.isDefined( query ) ) {

            if ( iteeValidators.isNotObject( query ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'La requete devrait être un objet javascript.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyObject( query ) ) {

                this._readAll( projection, response, next );

            } else {

                this._readWhere( query, projection, response, next );

            }

        } else {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'La requete ne peut pas être null.'
            }, ( this._useNext ) ? next : response );

        }

    }

    _readOne ( /*id, projection, response, next*/ ) {}

    _readMany ( /*ids, projection, response, next*/ ) {}

    _readWhere ( /*query, projection, response, next*/ ) {}

    _readAll ( /*projection, response, next*/ ) {}

    update ( request, response, next ) {

        const id          = request.params[ 'id' ];
        const requestBody = request.body;
        const haveBody    = ( iteeValidators.isDefined( requestBody ) );
        const ids         = ( haveBody ) ? requestBody.ids : null;
        const query       = ( haveBody ) ? requestBody.query : null;
        const update      = ( haveBody ) ? requestBody.update : null;

        if ( iteeValidators.isNotDefined( update ) ) {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'La mise à jour a appliquer ne peut pas être null ou indefini.'
            }, ( this._useNext ) ? next : response );

        } else if ( iteeValidators.isDefined( id ) ) {

            if ( iteeValidators.isNotString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant devrait être une chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyString( id ) || iteeValidators.isBlankString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant ne peut pas être une chaine de caractères vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._updateOne( id, update, response, next );

            }

        } else if ( iteeValidators.isDefined( ids ) ) {

            if ( iteeValidators.isNotArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants devrait être un tableau de chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants ne peut pas être vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._updateMany( ids, update, response, next );

            }

        } else if ( iteeValidators.isDefined( query ) ) {

            if ( iteeValidators.isNotObject( query ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'La requete devrait être un objet javascript.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyObject( query ) ) {

                this._updateAll( update, response, next );

            } else {

                this._updateWhere( query, update, response, next );

            }

        } else {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'La requete ne peut pas être vide.'
            }, ( this._useNext ) ? next : response );

        }

    }

    _updateOne ( /*id, update, response, next*/ ) {}

    _updateMany ( /*ids, updates, response, next*/ ) {}

    _updateWhere ( /*query, update, response, next*/ ) {}

    _updateAll ( /*update, response, next*/ ) {}

    delete ( request, response, next ) {

        const id          = request.params[ 'id' ];
        const requestBody = request.body;
        const haveBody    = ( iteeValidators.isDefined( requestBody ) );
        const ids         = ( haveBody ) ? requestBody.ids : null;
        const query       = ( haveBody ) ? requestBody.query : null;

        if ( iteeValidators.isDefined( id ) ) {

            if ( iteeValidators.isNotString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant devrait être une chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyString( id ) || iteeValidators.isBlankString( id ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'L\'identifiant ne peut pas être une chaine de caractères vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._deleteOne( id, response, next );

            }

        } else if ( iteeValidators.isDefined( ids ) ) {

            if ( iteeValidators.isNotArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants devrait être un tableau de chaine de caractères.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyArray( ids ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'Le tableau d\'identifiants ne peut pas être vide.'
                }, ( this._useNext ) ? next : response );

            } else {

                this._deleteMany( ids, response, next );

            }

        } else if ( iteeValidators.isDefined( query ) ) {

            if ( iteeValidators.isNotObject( query ) ) {

                TAbstractDataController.returnError( {
                    title:   'Erreur de paramètre',
                    message: 'La requete devrait être un objet javascript.'
                }, ( this._useNext ) ? next : response );

            } else if ( iteeValidators.isEmptyObject( query ) ) {

                this._deleteAll( response, next );

            } else {

                this._deleteWhere( query, response, next );

            }

        } else {

            TAbstractDataController.returnError( {
                title:   'Erreur de paramètre',
                message: 'La requete ne peut pas être vide.'
            }, ( this._useNext ) ? next : response );

        }

    }

    _deleteOne ( /*id, response, next*/ ) {}

    _deleteMany ( /*ids, response, next*/ ) {}

    _deleteWhere ( /*query, response, next*/ ) {}

    _deleteAll ( /*response, next*/ ) {}

}

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

/* Writable memory stream */
class MemoryWriteStream extends stream.Writable {

    constructor ( options ) {

        super( options );

        const bufferSize  = options.bufferSize || buffer.kStringMaxLength;
        this.memoryBuffer = Buffer.alloc( bufferSize );
        this.offset       = 0;
    }

    _final ( callback ) {

        callback();

    }

    _write ( chunk, encoding, callback ) {

        // our memory store stores things in buffers
        const buffer = ( Buffer.isBuffer( chunk ) ) ? chunk : new Buffer( chunk, encoding );

        // concat to the buffer already there
        for ( let byteIndex = 0, numberOfByte = buffer.length ; byteIndex < numberOfByte ; byteIndex++ ) {
            this.memoryBuffer[ this.offset ] = buffer[ byteIndex ];
            this.offset++;
        }

        // Next
        callback();

    }

    _writev ( chunks, callback ) {

        for ( let chunkIndex = 0, numberOfChunks = chunks.length ; chunkIndex < numberOfChunks ; chunkIndex++ ) {
            this.memoryBuffer = Buffer.concat( [ this.memoryBuffer, chunks[ chunkIndex ] ] );
        }

        // Next
        callback();

    }

    _releaseMemory () {

        this.memoryBuffer = null;

    }

    toArrayBuffer () {

        const buffer      = this.memoryBuffer;
        const arrayBuffer = new ArrayBuffer( buffer.length );
        const view        = new Uint8Array( arrayBuffer );

        for ( let i = 0 ; i < buffer.length ; ++i ) {
            view[ i ] = buffer[ i ];
        }

        this._releaseMemory();

        return arrayBuffer

    }

    toJSON () {

        return JSON.parse( this.toString() )

    }

    toString () {

        const string = this.memoryBuffer.toString();
        this._releaseMemory();

        return string

    }

}

////////

class TAbstractFileConverter {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                dumpType: TAbstractFileConverter.DumpType.ArrayBuffer
            }, ...parameters
        };

        this.dumpType = _parameters.dumpType;

        this._isProcessing = false;
        this._queue        = [];

    }

    get dumpType () {

        return this._dumpType

    }

    set dumpType ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Dump type cannot be null ! Expect a non empty string.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Dump type cannot be undefined ! Expect a non empty string.' ) }

        this._dumpType = value;

    }

    setDumpType ( value ) {

        this.dumpType = value;
        return this

    }

    convert ( file, parameters, onSuccess, onProgress, onError ) {

        if ( !file ) {
            onError( 'File cannot be null or empty, aborting file convertion !!!' );
            return
        }

        this._queue.push( {
            file,
            parameters,
            onSuccess,
            onProgress,
            onError
        } );

        this._processQueue();

    }

    _processQueue () {

        if ( this._queue.length === 0 || this._isProcessing ) { return }

        this._isProcessing = true;

        const self       = this;
        const dataBloc   = this._queue.shift();
        const file       = dataBloc.file;
        const parameters = dataBloc.parameters;
        const onSuccess  = dataBloc.onSuccess;
        const onProgress = dataBloc.onProgress;
        const onError    = dataBloc.onError;

        if ( iteeValidators.isString( file ) ) {

            self._dumpFileInMemoryAs(
                self._dumpType,
                file,
                parameters,
                _onDumpSuccess,
                _onProcessProgress,
                _onProcessError
            );

        } else {

            const data = file.data;

            switch ( self._dumpType ) {

                case TAbstractFileConverter.DumpType.ArrayBuffer: {

                    const bufferSize  = data.length;
                    const arrayBuffer = new ArrayBuffer( bufferSize );
                    const view        = new Uint8Array( arrayBuffer );

                    for ( let i = 0 ; i < bufferSize ; ++i ) {
                        view[ i ] = data[ i ];
                    }

                    _onDumpSuccess( arrayBuffer );

                }
                    break

                case TAbstractFileConverter.DumpType.JSON:
                    _onDumpSuccess( JSON.parse( data.toString() ) );
                    break

                case TAbstractFileConverter.DumpType.String:
                    _onDumpSuccess( data.toString() );
                    break

                default:
                    throw new RangeError( `Invalid switch parameter: ${self._dumpType}` )

            }

        }

        function _onDumpSuccess ( data ) {

            self._convert(
                data,
                parameters,
                _onProcessSuccess,
                _onProcessProgress,
                _onProcessError
            );

        }

        function _onProcessSuccess ( threeData ) {

            onSuccess( threeData );

            self._isProcessing = false;
            self._processQueue();

        }

        function _onProcessProgress ( progress ) {

            onProgress( progress );

        }

        function _onProcessError ( error ) {

            onError( error );

            self._isProcessing = false;
            self._processQueue();

        }

    }

    _dumpFileInMemoryAs ( dumpType, file, parameters, onSuccess, onProgress, onError ) {

        let isOnError = false;

        const fileReadStream = fs.createReadStream( file );

        fileReadStream.on( 'error', ( error ) => {
            console.error( `Read stream on error: ${error}` );

            isOnError = true;
            onError( error );

        } );

        const fileSize          = parseInt( parameters.fileSize );
        const memoryWriteStream = new MemoryWriteStream( { bufferSize: fileSize } );

        memoryWriteStream.on( 'error', ( error ) => {

            isOnError = true;
            onError( error );

        } );

        memoryWriteStream.on( 'finish', () => {

            if ( isOnError ) {
                return
            }

            switch ( dumpType ) {

                case TAbstractFileConverter.DumpType.ArrayBuffer:
                    onSuccess( memoryWriteStream.toArrayBuffer() );
                    break

                case TAbstractFileConverter.DumpType.String:
                    onSuccess( memoryWriteStream.toString() );
                    break

                case TAbstractFileConverter.DumpType.JSON:
                    onSuccess( memoryWriteStream.toJSON() );
                    break

                default:
                    throw new RangeError( `Invalid switch parameter: ${dumpType}` )

            }

            fileReadStream.unpipe();
            fileReadStream.close();
            memoryWriteStream.end();

        } );

        fileReadStream.pipe( memoryWriteStream );

    }

    _convert ( /*data, parameters, onSuccess, onProgress, onError*/ ) {}

}

TAbstractFileConverter.MAX_FILE_SIZE = 67108864;

TAbstractFileConverter.DumpType = Object.freeze( {
    ArrayBuffer: 0,
    String:      1,
    JSON:        2
} );

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TAbstractDatabasePlugin {

    static _registerRoutesTo ( Driver, Application, Router, ControllerCtors, descriptors ) {

        for ( let index = 0, numberOfDescriptor = descriptors.length ; index < numberOfDescriptor ; index++ ) {

            const descriptor      = descriptors[ index ];
            const ControllerClass = ControllerCtors.get( descriptor.controller.name );
            const controller      = new ControllerClass( { driver: Driver, ...descriptor.controller.options } );
            const router          = Router( { mergeParams: true } );

            console.log( `\tAdd controller for base route: ${descriptor.route}` );
            Application.use( descriptor.route, TAbstractDatabasePlugin._populateRouter( router, controller, descriptor.controller.can ) );

        }

    }

    static _populateRouter ( router, controller, can = {} ) {

        for ( let _do in can ) {

            const action = can[ _do ];

            console.log( `\t\tMap route ${action.over} on (${action.on}) to ${controller.constructor.name}.${_do} method.` );
            router[ action.on ]( action.over, controller[ _do ].bind( controller ) );

        }

        return router

    }

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                controllers: new Map(),
                descriptors: []
            }, ...parameters
        };

        this.controllers = _parameters.controllers;
        this.descriptors = _parameters.descriptors;

        this.__dirname = undefined;

    }

    get controllers () {
        return this._controllers
    }

    set controllers ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Controllers cannot be null ! Expect a map of controller.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Controllers cannot be undefined ! Expect a map of controller.' ) }
        if ( !( value instanceof Map ) ) { throw new TypeError( `Controllers cannot be an instance of ${value.constructor.name} ! Expect a map of controller.` ) }

        this._controllers = value;

    }

    get descriptors () {
        return this._descriptors
    }

    set descriptors ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Descriptors cannot be null ! Expect an array of POJO.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Descriptors cannot be undefined ! Expect an array of POJO.' ) }

        this._descriptors = value;

    }

    addController ( value ) {

        this._controllers.set( value.name, value );
        return this

    }

    addDescriptor ( value ) {

        this._descriptors.push( value );
        return this

    }

    beforeRegisterRoutes ( /*driver*/ ) {}

    registerTo ( driver, application, router ) {

        this.beforeRegisterRoutes( driver );

        TAbstractDatabasePlugin._registerRoutesTo( driver, application, router, this._controllers, this._descriptors );

    }

}

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TAbstractDatabase {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                driver:      null,
                application: null,
                router:      null,
                plugins:     []
            }, ...parameters
        };

        this.driver      = _parameters.driver;
        this.application = _parameters.application;
        this.router      = _parameters.router;
        this.plugins     = _parameters.plugins;

        this.init();

        this._registerPlugins();

    }

    get plugins () {

        return this._plugins

    }

    set plugins ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Plugins cannot be null ! Expect an array of TDatabasePlugin.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Plugins cannot be undefined ! Expect an array of TDatabasePlugin.' ) }

        this._plugins = value;

    }

    get router () {

        return this._router

    }

    set router ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Router cannot be null ! Expect a Express Router.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Router cannot be undefined ! Expect a Express Router.' ) }

        this._router = value;

    }

    get application () {

        return this._application

    }

    set application ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Application cannot be null ! Expect a Express Application.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Application cannot be undefined ! Expect a Express Application.' ) }

        this._application = value;

    }

    get driver () {

        return this._driver

    }

    set driver ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Driver cannot be null ! Expect a database driver.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Driver cannot be undefined ! Expect a database driver.' ) }

        this._driver = value;

    }

    setPlugins ( value ) {

        this.plugins = value;
        return this

    }

    setRouter ( value ) {

        this.router = value;
        return this

    }

    setApplication ( value ) {

        this.application = value;
        return this

    }

    setDriver ( value ) {

        this.driver = value;
        return this

    }

    init () {}

    _registerPlugins () {

        for ( let [ name, config ] of Object.entries( this._plugins ) ) {

            if ( this._registerPackagePlugin( name, config ) ) {

                console.log( `Use ${name} plugin from node_modules` );

            } else if ( this._registerLocalPlugin( name, config ) ) {

                console.log( `Use ${name} plugin from local folder` );

            } else {

                console.error( `Unable to register the plugin ${name} the package or local folder doesn't seem to exist ! Skip it.` );

            }

        }

    }

    _registerPackagePlugin ( name ) {

        let success = false;

        try {

            const plugin = require( name );
            if ( plugin instanceof TAbstractDatabasePlugin ) {

                plugin.__dirname = path.dirname( require.resolve( name ) );
                plugin.registerTo( this._driver, this._application, this._router );

                success = true;

            } else {

                console.error( `The plugin ${name} doesn't seem to be an instance of an extended class from TAbstractDatabasePlugin ! Skip it.` );

            }

        } catch ( error ) {

            if ( !error.code || error.code !== 'MODULE_NOT_FOUND' ) {

                console.error( error );

            }

        }

        return success

    }

    _registerLocalPlugin ( name ) {

        let success = false;

        try {

            // todo use rootPath or need to resolve depth correctly !
            const localPluginPath = path.join( __dirname, '../../../', 'databases/plugins/', name, `${name}.js` );
            const plugin          = require( localPluginPath );

            if ( plugin instanceof TAbstractDatabasePlugin ) {

                plugin.__dirname = path.dirname( require.resolve( localPluginPath ) );
                plugin.registerTo( this._driver, this._application, this._router );

                success = true;

            } else {

                console.error( `The plugin ${name} doesn't seem to be an instance of an extended class from TAbstractDatabasePlugin ! Skip it.` );

            }

        } catch ( error ) {

            console.error( error );

        }

        return success

    }

    connect () {}

    close ( /*callback*/ ) {}

    on ( /*eventName, callback*/ ) {}

}

/**
 * @author [Ahmed DCHAR]{@link https://github.com/dragoneel}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

const PostgreSQLDriver = PostgreSQL( {} );

class TPostgreSQLDatabase extends TAbstractDatabase {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                host:     'localhost',
                port:     '5432',
                database: 'postgres'
            },
            ...parameters,
            ...{
                driver: PostgreSQLDriver
            }
        };

        super( _parameters );

        this._host     = _parameters.host;
        this._port     = _parameters.port;
        this._database = _parameters.database;

    }

    close ( /*onCloseCallback*/ ) {}

    connect () {

        this._driver.one( ` SELECT 1 `, [] )
            .then( ( data ) => {
                console.log( `PostgreSQL at ${this._host}:${this._port}/${this._database} is connected ! ${data}` );
            } )
            .catch( ( error ) => {
                console.log( 'PostgreSQL - Connection error ', error );
            } );
    }

    init () {
        super.init();

    }

    on ( /*eventName, callback*/ ) {}

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

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( `${valueName} cannot be null ! ${expect}` ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( `${valueName} cannot be undefined ! ${expect}` ) }

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

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( `${valueName} cannot be null ! ${expect}` ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( `${valueName} cannot be undefined ! ${expect}` ) }
        if ( iteeValidators.isNotString( value ) ) { throw new TypeError( `${valueName} cannot be an instance of ${value.constructor.name} ! ${expect}` ) }

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

exports.TPostgreSQLController = TPostgreSQLController;
exports.TPostgreSQLDatabase = TPostgreSQLDatabase;
//# sourceMappingURL=itee-postgresql.cjs.js.map
