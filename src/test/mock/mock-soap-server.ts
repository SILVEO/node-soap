/* eslint-disable @typescript-eslint/no-explicit-any */
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as soap from "../../soap";
import { IXmlAttribute } from "../../soap";

export class MockSoapServer {

    public port: number;
    public wsdl: string;
    public soapService: any;
    public wsdlUrl: string;
    public endpointUrl: string;
    public server: http.Server;

    constructor(port: number) {
        this.port = port;
        this.initWsdl();
        this.initSoapServices();
        this.endpointUrl = `http://localhost:${port}/webservice/cwebservice.asmx`;
        this.wsdlUrl = `${this.endpointUrl}?wsdl`;
    }

    /**
     * Init machine WSDL
     */
    private initWsdl() {
        this.wsdl = fs.readFileSync(path.join(__dirname, "./Service.wsdl"), { encoding: "utf-8" });
        this.wsdl = this.wsdl.split("localhost:8000").join(`localhost:${this.port}`);
    }


    countsFunction(args: any): any {
        return {
            CountsResult: '<![CDATA[<Parent id="0"><subElement id="1"><key1>3</key1><key2>3</key2><key3>3</key3></subElement></Parent>]]>'
        };
    }

    /**
     * Initialize the Soap Services
     */
    private initSoapServices(): void {
        this.soapService = {
            CWebService: {
                CWebServiceSoap: {
                    // This is how to define an asynchronous function with a Promise.
                    Counts: this.countsFunction,
                },
                CWebServiceSoap12: {
                }
            }
        };

        this.soapService.CWebService.CWebServiceSoap12 = this.soapService.CWebService.CWebServiceSoap;
    }


    /**
     * Start and listen the soap server
     */
    async start(): Promise<void> {
        const port = this.port;
        const server = http.createServer((request, response) => {
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.write(`404: Not Found: ${request.url}`);
            response.end();
        });
        this.server = server;

        server.listen(port);

        const soapEnvAttr: IXmlAttribute[] = [
            {
                name: "xmlns:soap",
                value: "http://schemas.xmlsoap.org/soap/envelope/"

            },
            {
                name: "xmlns:xsi",
                value: "http://www.w3.org/2001/XMLSchema-instance"
            },
            {
                name: "xmlns:xsd",
                value: "http://www.w3.org/2001/XMLSchema"
            }
        ];

        const soapServer = soap.listen(server, "/webservice/cwebservice.asmx", this.soapService, this.wsdl, () => {
            console.info(`Server initialized on ${this.wsdlUrl}`);
        }, soapEnvAttr);

        soapServer.log = function (type: any, data: any) {
            // type is 'received' or 'replied'
            // console.log(type, data);
        };

        soapServer.on("request", (a) => {
            console.info("Request", a);
        })
    }

    async shutdown(): Promise<void> {
        this.server.close();
    }
}

const defaultPort = 8000;
(async () => {
    const mockSoapServer = await new MockSoapServer(defaultPort);
    mockSoapServer.start();

    process.on("SIGINT", () => {
        console.log("Shutting down");
        mockSoapServer.shutdown();
        process.exit(1);
    })
})();