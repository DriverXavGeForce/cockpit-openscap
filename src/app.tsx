/*
 * Copyright (C) 2025 SUSE LLC
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 *
 * To contact SUSE LLC about this file by physical or electronic mail, you may
 * find current contact information at www.suse.com.
 */

import React from 'react';
import { ListingTable } from 'cockpit-components-table.jsx';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { Button, EmptyState, EmptyStateBody, Spinner, Title, Gallery, Page, PageSidebar, PageSection } from "@patternfly/react-core";
import { useId } from 'react';
import { Progress, ProgressMeasureLocation } from '@patternfly/react-core';
import { Alert } from '@patternfly/react-core';
import { Fragment } from 'react';
import { Divider } from '@patternfly/react-core';

import cockpit from 'cockpit';

const _ = cockpit.gettext;
const emptySidebar = <PageSidebar isSidebarOpen={false} />;

const parser = new DOMParser();

export const Application = () => {

    const [info, setInfo] = React.useState("");
    const [evals, setEval] = React.useState("");
    const [selectedProfile, setSelectedProfile] = React.useState("--Please choose a profile--");
    const [selectedFile, setSelectedFile] = React.useState("--Please choose a file--");
    const [XCCDFFileList, setXCCDFFileList] = React.useState("");
    const [reportContent, setReportContent] = React.useState("");
    const [rulesContent, setRulesContent] = React.useState("");
    const [reportTag, setReportTag] = React.useState("");
    const [rulesTag, setRulesTag] = React.useState("");
    const [reportHTML, setReportHTML] = React.useState("");

    React.useEffect(() => {
	cockpit.spawn(["ls", "/usr/share/xml/scap/ssg/content/"])
                .then(stdout => setXCCDFFileList(stdout))
                .catch(() => setXCCDFFileList("There was an error running oscap command."));
    }, []);

    function listProfiles(result){
	var profilesList = result.split('\n');
	const re = new RegExp("WARNING");
	for (let i = 0; i < profilesList.length; i++) {
	    if (profilesList[i].search(re) == -1) {
                profilesList[i] = profilesList[i].trim().split(':')
	    }
	}
        return profilesList;
    }

    function listXCCDFFile(result){
        var tmpList  = result.split('\n');
	var FileList = [];
	for (let i = 0; i < tmpList.length; i++) {
	    if (tmpList[i].match(/-ds.xml/) != null) {
		    FileList.push(tmpList[i]);
	    }
	}
	return FileList;
    }

    async function run_info(file_name){
        await cockpit.spawn(["oscap", "info", "--profiles", "/usr/share/xml/scap/ssg/content/"+file_name])
                .then(stdout => setInfo(stdout))
                .catch(() => setInfo("There was an error running oscap command."));
    }

    async function run_benchmark(id, file_name){
        setReportHTML(loadingBenchmark);
	await cockpit.spawn(["oscap", "xccdf", "eval", "--profile", id , "--results", "report.xml", "/usr/share/xml/scap/ssg/content/"+file_name], { "directory": "/var/tmp/", "superuser": "require" })
	       .then(stdout => setEval(stdout))
               .catch(() => setEval("There was an error running oscap command."));
	await cockpit.file("/var/tmp/report.xml").read()
               .then((reportContent, reportTag) => {
                   setReportContent(reportContent);
		   setReportTag(reportTag);
		   setReportHTML(generateHTMLreport(reportContent));
	       })
               .catch(error => {
               });
	await cockpit.spawn(["rm","-rf","report.xml"], { "directory": "/var/tmp/", "superuser": "require" })
               .then(stdout => setEval(stdout))
               .catch(() => setEval("Can't delete /var/tmp/report.xml."));
    }

    function cleanResults(results){
        const re = new RegExp("--- Starting Evaluation ---");
	var resultsTemp = results.split('\n');
	var resultsList = [];
	var resultsListTmp = [];
	for (let i = 0; i < resultsTemp.length; i++) {
            if  (resultsTemp[i].search(re) == -1) {
		if  (resultsTemp[i]) {
                    resultsListTmp.push(resultsTemp[i]);
		} else {
	            if (resultsListTmp.length > 0){
			    resultsList.push(resultsListTmp);
		            resultsListTmp = [];
	            }
	        }
	    }
	}
	return resultsList;
    }
    
    const files = listXCCDFFile(XCCDFFileList);

    const profiles = listProfiles(info);

    const results_benchmark = cleanResults(evals);

    const loadingBenchmark = () => {
        return (
	    <Card>
	        <CardBody>
                    <EmptyState icon={Spinner}>
                        <Title headingLevel="h2">{_("Running Benchmark...")}</Title>
                    </EmptyState>
	        </CardBody>
	    </Card>
        );
    };

    function generateHTMLreport(XMLReport){
        if (XMLReport == null){
            const viewReport = (
		<Card>
                <CardBody>    
		<Fragment>
                    <Alert variant="danger" isInline title="No benchmark result!!!" ouiaId="DangerAlert" />
                </Fragment>
		</CardBody>
                </Card>
	    );
	    return viewReport;
	}
	else{
	const doc = parser.parseFromString(XMLReport, "application/xml");
        const viewReport = (
            <Card key="viewReport-card">
	        <CardTitle size="md">{ doc.getElementsByTagName("Profile")[0].getElementsByTagName("title")[0].innerHTML }</CardTitle>
                <CardBody key="viewReport-cardbody">{ doc.getElementsByTagName("Profile")[0].getElementsByTagName("description")[0].innerHTML }</CardBody>
		<CardBody>
		    <Progress value={ doc.getElementsByTagName("TestResult")[0].getElementsByTagName("score")[0].innerHTML } title="Score" measureLocation={ProgressMeasureLocation.inside}/>
		</CardBody>
		<CardBody>    
		    <Table>
                        <Tbody key="viewReport-body">
			    <Tr key="viewReport-title">
			        <Th>
			            <Title headingLevel="h3" size="md">Rule</Title>
			        </Th>
			        <Th>
                                    <Title headingLevel="h3" size="md">Severity</Title>
                                </Th>
			        <Th>
                                    <Title headingLevel="h3" size="md">Status</Title>
                                </Th>
			    </Tr>
			{ function() {
			      let rules = [];
		              for (var k = 0; k < doc.getElementsByTagName("Profile")[0].getElementsByTagName("select").length; k++){
			          if (doc.getElementsByTagName("Profile")[0].getElementsByTagName("select")[k].getAttribute("selected") == "true"){
				      for (var i = 0; i < doc.getElementsByTagName("TestResult")[0].getElementsByTagName("rule-result").length; i++){
				          let ruleId = doc.getElementsByTagName("TestResult")[0].getElementsByTagName("rule-result")[i].attributes[0].nodeValue;
			                  if (ruleId == doc.getElementsByTagName("Profile")[0].getElementsByTagName("select")[k].getAttribute("idref")){
				              for (var j = 0; j < doc.getElementsByTagName("Rule").length; j++){
			                          if ( doc.getElementsByTagName("Rule")[j].id == ruleId ){
				                      rules.push(<Tr key= { ruleId }>
								     <Td> { doc.getElementsByTagName("Rule")[j].getElementsByTagName("title")[0].innerHTML } <br />
								     { doc.getElementsByTagName("Rule")[j].getElementsByTagName("rationale")[0].innerHTML.replace(/(<([^>]+)>)/gi, '') } </Td>
								     <Td> { doc.getElementsByTagName("TestResult")[0].getElementsByTagName("rule-result")[i].getAttribute("severity") } </Td>
								     <Td> { doc.getElementsByTagName("TestResult")[0].getElementsByTagName("rule-result")[i].getElementsByTagName("result")[0].innerHTML } </Td>
								 </Tr>
								);
				                  }
			                      }
				          }
			              }
			          }
			      }
		              return rules
			      }()
			}
			</Tbody>
                    </Table>
                </CardBody>
            </Card>
        );
	return viewReport;
	}
    }

    async function run_remediation(id, file_name){
	await cockpit.file("/usr/share/xml/scap/ssg/content/"+file_name).read()
               .then((rulesContent, rulesTag) => {
                   setRulesContent(rulesContent);
                   setRulesTag(rulesTag);
                   setReportHTML(generate_remediation(id, rulesContent));
               })
               .catch(error => {
               });
    }

    function generate_remediation(id, rulesXML){
	const doc = parser.parseFromString(rulesXML, "application/xml");
        console.log(doc);
	const viewSelectRules = (
            <Card key="viewReport-card">
                <CardBody key="viewReport-cardbody">
                    <Table key="viewReport-table">
                        <Thead>
                            <Tr>
                                <Th>
                                    <Title headingLevel="h2" size="md">Remediation</Title>
                                </Th>
                            </Tr>
			</Thead>
                    </Table>
                </CardBody>
            </Card>
        );
        return viewSelectRules;
    }

    return (
         <Page sidebar={emptySidebar}>
             <PageSection>
                 <Gallery className="ct-cards-grid" hasGutter>
	             <Card>
                         <CardBody>
	                     <Table>
                                 <Thead>
                                     <Tr>
                                         <Th>
                                             <Title headingLevel="h2" size="md">Select a SCAP source data stream file:</Title>
                                         </Th>
                                         <Th>
                                             <Title headingLevel="h2" size="md">Select a profile:</Title>
                                         </Th>
                                     </Tr>
                                 </Thead>
                                 <Tbody key="bench-result-tbody">
                                     <Tr key="profile-select-tr">
                                         <Td key="file-select-td">
                                             <select id="file"
                                             key="file-select"
                                             value={ selectedFile }
                                             onChange={ e => {
                                                     setSelectedFile(e.target.value);
                                                     run_info(e.target.value);
                                                     }
                                             }
                                             >
                                             <option key="default" value="default">--Please choose a file--</option>
                                             {files.map((counter, i) => (
                                             <option key={ files[i] } value={ files[i] }>{ files[i] }</option>
                                             ))}
                                             </select>
                                         </Td>
                                         <Td key="profile-select-td">
                                             <select id="profile"
                                             key="profile-select"
                                             value={ selectedProfile }
                                             onChange={ e => setSelectedProfile(e.target.value) }
                                             >
                                             <option key="default" value="default">--Please choose a profile--</option>
                                             {profiles.map((counter, i) => (
                                             <option key={ profiles[i][0] } value={ profiles[i][0] }>{ profiles[i][1] }</option>
                                             ))}
                                             </select>
                                         </Td>
                                         <Td key="button-run-benchmark-th" className="pf-v6-u-text-align-end">
                                             <Button variant="primary" id="bench-button"
                                             onClick = {() => run_benchmark(selectedProfile, selectedFile)}>
                                             Start benchmark
                                             </Button>
                                         </Td>
                                         <Td key="button-run-remediation-td" className="pf-v6-u-text-align-end">
                                             <Button variant="primary" id="remediation-button"
                                             onClick = {() => run_remediation(selectedProfile, selectedFile)}>
                                             Start remediation
                                             </Button>
                                         </Td>
                                     </Tr>
                                 </Tbody>
                             </Table>
                         </CardBody>
                     </Card>
	             { reportHTML }
		 </Gallery>
             </PageSection>
         </Page>
    );
};
