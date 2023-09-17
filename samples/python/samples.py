# pip install requests

import requests

# Step 1 - Define the constant values.
aadTenant = "https://login.microsoftonline.com/"
aadTenantId = "<tenant id>"

appId = "<AAD enterprise application id>"
appSecret = "<AAD application secret/password>"

fhirEndpoint = "https://<workspace name>-<service name>.fhir.azurehealthcareapis.com/"

##########################################################

def getHttpHeader(accessToken):
    return {
        "Authorization": "Bearer " + accessToken,
        "Content-type": "application/json"
    }

def printResourceData(resource):
    resourceType = resource['resourceType']
    itemId = resource['id']
    if (resourceType == "OperationOutcome"):
        print("\t" + resource)
    else:
        itemId = resource['id']
        print("\t" + resourceType + "/" + itemId)

def printResponseResults(response):
    responseAsJson = response.json()

    if (responseAsJson.get('entry') == None):
        # Print the resource type and id of a resource. 
        printResourceData(responseAsJson)
    else:
        # Prints the resource type and ids of all resources under a bundle.
        for item in responseAsJson.get('entry'):
            resource = item['resource']
            printResourceData(resource)

##########################################################

def getAuthToken():
    response = requests.post(
        aadTenant + aadTenantId + '/oauth2/token',
        data={
            'client_id': appId,
            "client_secret": appSecret,
            "grant_type": "client_credentials",
            "resource": fhirEndpoint})
    responseAsJson = response.json()

    if response.status_code != 200:
        print("\tError getting token: " + str(response.status_code))
        return None
    else:
        accessToken = responseAsJson.get('access_token')
        print("\tAAD Access Token acquired: " + accessToken[:50] + "...")
        return accessToken

def postPatient(accessToken):

    # Example of FHIR Patient: https://www.hl7.org/fhir/patient-example.json.html

    patientData = {
        "resourceType" : "Patient",
        "active" : True,
        "name" : [{
            "use" : "official",
            "family" : "LastName",
            "given" : ["FirstName", "MiddleName"]
        }],
        "telecom" : [
        {
            "system" : "phone",
            "value" : "(11) 99988-7766",
            "use" : "mobile",
            "rank" : 1
        }],
        "gender" : "male",
        "birthDate" : "1974-12-25",
        "address" : [{
            "use" : "home",
            "type" : "both",
            "text" : "534 Erewhon St PeasantVille, Rainbow, Vic  3999",
            "line" : ["534 Erewhon St"],
            "city" : "PleasantVille",
            "district" : "Rainbow",
            "state" : "Vic",
            "postalCode" : "3999",
            "period" : {
            "start" : "1974-12-25"
            }
        }]
    }

    response = requests.post(
        url= fhirEndpoint + 'Patient',
        json= patientData,
        headers= getHttpHeader(accessToken))
    responseAsJson = response.json()
    
    if response.status_code == 200 or response.status_code == 201:
        resourceId = responseAsJson.get('id')
        print("\tPatient ingested: " + resourceId + ". HTTP " + str(response.status_code))
        return resourceId
    else:
        print("\tError persisting patient: " + str(response.status_code))
        return None

def postPractitioner(accessToken):

    # Example of FHIR Practitioner: https://www.hl7.org/fhir/practitioner-example.json.html

    practitionerData = {
        "resourceType": "Practitioner",
        "active": True,
        "name": [
            {
            "family": "Smith",
            "given": ["John"]
            }
        ],
        "gender": "male",
        "birthDate": "1975-05-15",
        "address": [
            {
            "use": "home",
            "line": ["123 Main Street"],
            "city": "Anytown",
            "state": "CA",
            "postalCode": "12345"
            }
        ],
        "telecom": [
            {
            "system": "phone",
            "value": "555-555-5555"
            },
            {
            "system": "email",
            "value": "john.smith@example.com"
            }
        ],
        "qualification": [
            {
            "code": {
                "coding": [
                {
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": "Physician"
                }
                ],
                "text": "Physician"
            },
            "period": {
                "start": "2000-01-01"
            }
            }
        ]
    }

    response = requests.post(
        url= fhirEndpoint + 'Practitioner',
        json= practitionerData,
        headers= getHttpHeader(accessToken))
    responseAsJson = response.json()
    
    if response.status_code == 200 or response.status_code == 201:
        resourceId = responseAsJson.get('id')
        print("\tPractitioner ingested: " + resourceId + ". HTTP " + str(response.status_code))
        return resourceId
    else:
        print("\tError persisting practitioner: " + str(response.status_code))
        return None
    
def postAppointment(patientId, practitionerId, accessToken):

    # https://hl7.org/fhir/R4/appointment-example.json.html

    appointmentData = {
        "resourceType": "Appointment",
        "status": "booked",
        "description": "Follow-up appointment with Dr. Smith",
        "start": "2023-09-20T10:00:00-04:00",
        "end": "2023-09-20T11:00:00-04:00",
        "participant": [
            {
            "actor": {
                "reference": "Practitioner/" + practitionerId
            },
            "status": "accepted",
            "type": [
                {
                "coding": [
                    {
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                    "code": "ATND"
                    }
                ],
                "text": "Attendee"
                }
            ]
            },
            {
            "actor": {
                "reference": "Patient/" + patientId
            },
            "status": "accepted",
            "type": [
                {
                "coding": [
                    {
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                    "code": "PAT"
                    }
                ],
                "text": "Patient"
                }
            ]
            }
        ]
    }

    response = requests.post(
        url= fhirEndpoint + 'Appointment',
        json= appointmentData,
        headers= getHttpHeader(accessToken))
    responseAsJson = response.json()
    
    if response.status_code == 200 or response.status_code == 201:
        resourceId = responseAsJson.get('id')
        print("\tAppointment ingested: " + resourceId + ". HTTP " + str(response.status_code))
        return resourceId
    else:
        print("\tError persisting appointment: " + str(response.status_code))
        return None


def printPatientInfo(patientId, accessToken):

    # GET htts://<fhir endpoint>/Patient/<patientId>

    baseUrl = fhirEndpoint + 'Patient/' + patientId

    response = requests.get(
        baseUrl,
        headers= getHttpHeader(accessToken))
    
    if response.status_code == 200 or response.status_code == 201:
        printResponseResults(response)
    else:
        print("\tError getting pattient data: " + str(response.status_code))

def printAllAppointmentsAssignedToPatient(patientId, accessToken):

    # GET htts://<fhir endpoint>/Appointment?actor=Patient/<patientId>

    baseUrl = fhirEndpoint + 'Appointment'
    queryParams = { 'actor' : "Patient/" + patientId }

    response = requests.get(
        baseUrl,
        params= queryParams,
        headers= getHttpHeader(accessToken))
    
    if response.status_code == 200 or response.status_code == 201:
        printResponseResults(response)
    else:
        print("\tError getting appointments: " + str(response.status_code))

##########################################################

if __name__ == '__main__':
    # Step 2 - Acquire authentication token
    print("Acquire authentication token for secure communication.")
    accessToken = getAuthToken()
    if accessToken == None:
        exit()

    # Step 3 - Insert Patient
    print("Persist Patient data.")
    patientId = postPatient(accessToken)
    if patientId == None:
        exit()

    # Step 4 - Insert Practitioner (Doctor)
    print("Persist Practitioner data.")
    practitionerId = postPractitioner(accessToken)
    if practitionerId == None:
        exit()
    
    # Step 5 - Insert Appointments
    print("Insert multiple appointments using Patient and Practitioner IDs.")
    appointmentId1 = postAppointment(patientId, practitionerId, accessToken)
    if appointmentId1 == None:
        exit()

    appointmentId2 = postAppointment(patientId, practitionerId, accessToken)
    if appointmentId2 == None:
        exit()  

    appointmentId3 = postAppointment(patientId, practitionerId, accessToken)
    if appointmentId3 == None:
        exit()

    # Step 6 - Print Patient info
    print("Query Patient's data.")
    printPatientInfo(patientId, accessToken)

    # Step 7 - Print all appointments assigned to a Patient
    print("Query all Appointments assigned to a Patient.")
    printAllAppointmentsAssignedToPatient(patientId, accessToken)