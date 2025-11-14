from modules.agent_dbs import redis_client
from modules.agent_state import AgentState
from datetime import date
import requests
import json
import re


def validate_and_extract_email(email_string):
    """
    Validates if a given string is a valid email address and returns it.

    Args:
        email_string (str): The string to validate.

    Returns:
        str or None: The email address if valid, otherwise None.
    """
    # A relatively comprehensive regex for email validation
    email_regex = re.compile(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    )
    if email_regex.fullmatch(email_string):
        return email_string
    else:
        return None



def update_email(state: AgentState):
    print('########update email################')
    print(state['email'])
    today=date.today()
    effective_date=today.strftime('%Y-%m-%d')


    if state['email']:
        email = validate_and_extract_email(state['email'])

        if email and state['can_update'] =="yes" and state['self_update']=="yes":

            if state["domainid"]:

                response_emp=redis_client.hget("workers_info",state["domainid"])
                # print('#################')
                # print(type(response_emp))
                response=json.loads(response_emp)
                # print(type(response))
                print(response['associate']['AssociateID'])

                Associate_ID=str(response['associate']['AssociateID'])


                if Associate_ID.lower().startswith('c'):
                    payload =  f"<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<env:Envelope\r\n    xmlns:env=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n    xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n    xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\">\r\n    <env:Header>\r\n        <wsse:Security env:mustUnderstand=\"1\">\r\n            <wsse:UsernameToken>\r\n       <wsse:Username>ISU_INT853a_DHRA_Workforce_Agent@elevancehealth3</wsse:Username>\r\n                <wsse:Password\r\n                    Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText\">DHRAAgent@12345</wsse:Password>\r\n      </wsse:UsernameToken>\r\n        </wsse:Security>\r\n    </env:Header>\r\n\t<env:Body>\r\n\t\t<wd:Change_Home_Contact_Information_Request\r\n            xmlns:wd=\"urn:com.workday/bsvc\"\r\n            wd:version=\"v44.0\">\r\n\t\t\t<wd:Business_Process_Parameters>\r\n\t\t\t\t<wd:Auto_Complete>true</wd:Auto_Complete>\r\n\t\t\t\t<wd:Run_Now>true</wd:Run_Now>\r\n\t\t\t\t<wd:Discard_On_Exit_Validation_Error>true</wd:Discard_On_Exit_Validation_Error>\r\n\t\t\t</wd:Business_Process_Parameters>\r\n\t\t\t<wd:Change_Home_Contact_Information_Data>\r\n\t\t\t\t<wd:Person_Reference>\r\n\t\t\t\t\t<wd:ID wd:type=\"Contingent_Worker_ID\">{Associate_ID}</wd:ID>\r\n\t\t\t\t</wd:Person_Reference>\r\n\t\t\t\t<wd:Event_Effective_Date>{str(effective_date)}</wd:Event_Effective_Date>\r\n\t\t\t\t<wd:Person_Contact_Information_Data>\r\n\t\t\t\t\t<wd:Person_Email_Information_Data>\r\n                    <wd:Email_Information_Data>\r\n                                <wd:Email_Data>\r\n        <wd:Email_Address>{email}</wd:Email_Address>\r\n                                </wd:Email_Data>\r\n                                <wd:Usage_Data wd:Public=\"0\">\r\n                       <wd:Type_Data wd:Primary=\"1\">\r\n                                        <wd:Type_Reference> \r\n                     <wd:ID wd:type=\"Communication_Usage_Type_ID\">HOME</wd:ID>\r\n                      </wd:Type_Reference>\r\n                     </wd:Type_Data>\r\n                                </wd:Usage_Data>\r\n                               \r\n          </wd:Email_Information_Data>\r\n                        </wd:Person_Email_Information_Data>\r\n\t\t\t\t</wd:Person_Contact_Information_Data>\r\n\t\t\t</wd:Change_Home_Contact_Information_Data>\r\n\t\t</wd:Change_Home_Contact_Information_Request>\r\n\t</env:Body>\r\n</env:Envelope>"
                else:
                    payload =  f"<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<env:Envelope\r\n    xmlns:env=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n    xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n    xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\">\r\n    <env:Header>\r\n        <wsse:Security env:mustUnderstand=\"1\">\r\n            <wsse:UsernameToken>\r\n       <wsse:Username>ISU_INT853a_DHRA_Workforce_Agent@elevancehealth3</wsse:Username>\r\n                <wsse:Password\r\n                    Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText\">DHRAAgent@12345</wsse:Password>\r\n      </wsse:UsernameToken>\r\n        </wsse:Security>\r\n    </env:Header>\r\n\t<env:Body>\r\n\t\t<wd:Change_Home_Contact_Information_Request\r\n            xmlns:wd=\"urn:com.workday/bsvc\"\r\n            wd:version=\"v44.0\">\r\n\t\t\t<wd:Business_Process_Parameters>\r\n\t\t\t\t<wd:Auto_Complete>true</wd:Auto_Complete>\r\n\t\t\t\t<wd:Run_Now>true</wd:Run_Now>\r\n\t\t\t\t<wd:Discard_On_Exit_Validation_Error>true</wd:Discard_On_Exit_Validation_Error>\r\n\t\t\t</wd:Business_Process_Parameters>\r\n\t\t\t<wd:Change_Home_Contact_Information_Data>\r\n\t\t\t\t<wd:Person_Reference>\r\n\t\t\t\t\t<wd:ID wd:type=\"Employee_ID\">{Associate_ID}</wd:ID>\r\n\t\t\t\t</wd:Person_Reference>\r\n\t\t\t\t<wd:Event_Effective_Date>{str(effective_date)}</wd:Event_Effective_Date>\r\n\t\t\t\t<wd:Person_Contact_Information_Data>\r\n\t\t\t\t\t<wd:Person_Email_Information_Data>\r\n         <wd:Email_Information_Data>\r\n                                <wd:Email_Data>\r\n                                    <wd:Email_Address>{email}</wd:Email_Address>\r\n                                </wd:Email_Data>\r\n                                <wd:Usage_Data wd:Public=\"0\">\r\n                                    <wd:Type_Data wd:Primary=\"1\">\r\n                                        <wd:Type_Reference> \r\n                                      <wd:ID wd:type=\"Communication_Usage_Type_ID\">HOME</wd:ID>\r\n             </wd:Type_Reference>\r\n                             </wd:Type_Data>\r\n                                </wd:Usage_Data>\r\n                              \r\n                 </wd:Email_Information_Data>\r\n                        </wd:Person_Email_Information_Data>\r\n\t\t\t\t</wd:Person_Contact_Information_Data>\r\n\t\t\t</wd:Change_Home_Contact_Information_Data>\r\n\t\t</wd:Change_Home_Contact_Information_Request>\r\n\t</env:Body>\r\n</env:Envelope>"


            url = "https://wd2-impl-services1.workday.com/ccx/service/elevancehealth3/Human_Resources/v44.0"


            headers = {
            'Content-Type': 'application/xml',
            'Cookie': 'TS012df9cf=0141bf7902e85a03207ac8946c9531dcab8ecf0bcfaedb7a4263535bbf5fc2e5dccdda4c85b239d9f1d43187e2029b58bebc322c95'
            }

            response = requests.request("POST", url, headers=headers, data=payload)

            print(response.text)

            api_response=response.text

        elif state['can_update'] =="no" or state['self_update']=="no":
            api_response=''' <?xml version="1.0" encoding="UTF-8"?><response><status>ERROR</status><message>The email update was not successful.You can update or change only your Personal or Home email  </message><errorCode>1001</errorCode></response>'''

        else: api_response=''' <?xml version="1.0" encoding="UTF-8"?><response><status>ERROR</status><message>Invalid email format.</message><errorCode>1001</errorCode><details>The provided email does not adhere to the expected format. Please ensure you enter a valid email.</details></response>'''

    prompt=f'''You are a friendly, helpful conversational agent for inquiries related to user email update or change request,Respond only from the given question and xml response. Here is the user question: {state["query"]}.
    Here is the API XML response:
    {api_response}

    Note: Check only the given xml and respond whether email updaete or not, add if any reason mentioned.Do not mention the XML, the data source,or any reference.
    '''
    return {"prompt":prompt,"end_point": "/v2/text/chats","pre_task":"update_email"}