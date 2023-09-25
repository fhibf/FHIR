const axios = require('axios');

// Step 1 - Define the constant values.
const aadTenant = 'https://login.microsoftonline.com/';
const aadTenantId = '<tenant id>';

const appId = '<AAD enterprise application id>';
const appSecret = '<AAD application secret/password>';

const fhirEndpoint =
  'https://<workspace name>-<service name>.fhir.azurehealthcareapis.com/';

///////////////////////////////////////////////////////////

function getHttpHeader(accessToken) {
  return {
    Authorization: 'Bearer ' + accessToken,
    'Content-type': 'application/json',
  };
}

function printResourceData(resource) {
  const resourceType = resource['resourceType'];
  const itemId = resource['id'];
  if (resourceType === 'OperationOutcome') {
    console.log('\t' + resource);
  } else {
    const itemId = resource['id'];
    console.log('\t' + resourceType + '/' + itemId);
  }
}

function printResponseResults(response) {
  const responseAsJson = response.data;

  if (!responseAsJson.entry) {
    // Print the resource type and id of a resource.
    printResourceData(responseAsJson);
  } else {
    // Prints the resource type and ids of all resources under a bundle.
    for (const item of responseAsJson.entry) {
      const resource = item.resource;
      printResourceData(resource);
    }
  }
}

///////////////////////////////////////////////////////////

async function getAuthToken() {
  try {
    const response = await axios.post(
      aadTenant + aadTenantId + '/oauth2/token',
      {
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'client_credentials',
        resource: fhirEndpoint,
      }
    );
    const accessToken = response.data.access_token;
    console.log(
      '\tAAD Access Token acquired: ' + accessToken.substring(0, 50) + '...'
    );
    return accessToken;
  } catch (error) {
    console.log('\tError getting token: ' + error.response.status);
    return null;
  }
}

async function postPatient(accessToken) {
  // Example of FHIR Patient: https://www.hl7.org/fhir/patient-example.json.html

  const patientData = {
    resourceType: 'Patient',
    active: true,
    name: [
      {
        use: 'official',
        family: 'LastName',
        given: ['FirstName', 'MiddleName'],
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: '(11) 99988-7766',
        use: 'mobile',
        rank: 1,
      },
    ],
    gender: 'male',
    birthDate: '1974-12-25',
    address: [
      {
        use: 'home',
        type: 'both',
        text: '534 Erewhon St PeasantVille, Rainbow, Vic  3999',
        line: ['534 Erewhon St'],
        city: 'PleasantVille',
        district: 'Rainbow',
        state: 'Vic',
        postalCode: '3999',
        period: {
          start: '1974-12-25',
        },
      },
    ],
  };

  try {
    const response = await axios.post(fhirEndpoint + 'Patient', patientData, {
      headers: getHttpHeader(accessToken),
    });
    const resourceId = response.data.id;
    console.log(
      '\tPatient ingested: ' + resourceId + '. HTTP ' + response.status
    );
    return resourceId;
  } catch (error) {
    console.log('\tError persisting patient: ' + error.response.status);
    return null;
  }
}

async function postPractitioner(accessToken) {
  // Example of FHIR Practitioner: https://www.hl7.org/fhir/practitioner-example.json.html

  const practitionerData = {
    resourceType: 'Practitioner',
    active: true,
    name: [
      {
        family: 'Smith',
        given: ['John'],
      },
    ],
    gender: 'male',
    birthDate: '1975-05-15',
    address: [
      {
        use: 'home',
        line: ['123 Main Street'],
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: '555-555-5555',
      },
      {
        system: 'email',
        value: 'john.smith@example.com',
      },
    ],
    qualification: [
      {
        code: {
          coding: [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: 'Physician',
            },
          ],
          text: 'Physician',
        },
        period: {
          start: '2000-01-01',
        },
      },
    ],
  };

  try {
    const response = await axios.post(
      fhirEndpoint + 'Practitioner',
      practitionerData,
      { headers: getHttpHeader(accessToken) }
    );
    const resourceId = response.data.id;
    console.log(
      '\tPractitioner ingested: ' + resourceId + '. HTTP ' + response.status
    );
    return resourceId;
  } catch (error) {
    console.log('\tError persisting practitioner: ' + error.response.status);
    return null;
  }
}

async function postAppointment(patientId, practitionerId, accessToken) {
  // https://hl7.org/fhir/R4/appointment-example.json.html

  const appointmentData = {
    resourceType: 'Appointment',
    status: 'booked',
    description: 'Follow-up appointment with Dr. Smith',
    start: '2023-09-20T10:00:00-04:00',
    end: '2023-09-20T11:00:00-04:00',
    participant: [
      {
        actor: {
          reference: 'Practitioner/' + practitionerId,
        },
        status: 'accepted',
        type: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'ATND',
              },
            ],
            text: 'Attendee',
          },
        ],
      },
      {
        actor: {
          reference: 'Patient/' + patientId,
        },
        status: 'accepted',
        type: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PAT',
              },
            ],
            text: 'Patient',
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(
      fhirEndpoint + 'Appointment',
      appointmentData,
      { headers: getHttpHeader(accessToken) }
    );
    const resourceId = response.data.id;
    console.log(
      '\tAppointment ingested: ' + resourceId + '. HTTP ' + response.status
    );
    return resourceId;
  } catch (error) {
    console.log('\tError persisting appointment: ' + error.response.status);
    return null;
  }
}

async function printPatientInfo(patientId, accessToken) {
  // GET htts://<fhir endpoint>/Patient/<patientId>

  const baseUrl = fhirEndpoint + 'Patient/' + patientId;

  try {
    const response = await axios.get(baseUrl, {
      headers: getHttpHeader(accessToken),
    });
    printResponseResults(response);
  } catch (error) {
    console.log('\tError getting patient data: ' + error.response.status);
  }
}

async function printAllAppointmentsAssignedToPatient(patientId, accessToken) {
  // GET htts://<fhir endpoint>/Appointment?actor=Patient/<patientId>

  const baseUrl = fhirEndpoint + 'Appointment';
  const queryParams = { actor: 'Patient/' + patientId };

  try {
    const response = await axios.get(baseUrl, {
      params: queryParams,
      headers: getHttpHeader(accessToken),
    });
    printResponseResults(response);
  } catch (error) {
    console.log('\tError getting appointments: ' + error.response.status);
  }
}

///////////////////////////////////////////////////////////

(async () => {
  // Step 2 - Acquire authentication token
  console.log('Acquire authentication token for secure communication.');
  const accessToken = await getAuthToken();
  if (!accessToken) {
    process.exit(1);
  }

  // Step 3 - Insert Patient
  console.log('Persist Patient data.');
  const patientId = await postPatient(accessToken);
  if (!patientId) {
    process.exit(1);
  }

  // Step 4 - Insert Practitioner (Doctor)
  console.log('Persist Practitioner data.');
  const practitionerId = await postPractitioner(accessToken);
  if (!practitionerId) {
    process.exit(1);
  }

  // Step 5 - Insert Appointments
  console.log(
    'Insert multiple appointments using Patient and Practitioner IDs.'
  );
  const appointmentId1 = await postAppointment(
    patientId,
    practitionerId,
    accessToken
  );
  if (!appointmentId1) {
    process.exit(1);
  }

  const appointmentId2 = await postAppointment(
    patientId,
    practitionerId,
    accessToken
  );
  if (!appointmentId2) {
    process.exit(1);
  }

  const appointmentId3 = await postAppointment(
    patientId,
    practitionerId,
    accessToken
  );
  if (!appointmentId3) {
    process.exit(1);
  }

  // Step 6 - Print Patient info
  console.log("Query Patient's data.");
  printPatientInfo(patientId, accessToken);

  // Step 7 - Print all appointments assigned to a Patient
  console.log('Query all Appointments assigned to a Patient.');
  printAllAppointmentsAssignedToPatient(patientId, accessToken);
})();
