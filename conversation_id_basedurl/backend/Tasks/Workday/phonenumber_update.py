from modules.agent_dbs import redis_client
from modules.agent_state import AgentState
from datetime import date
import json
import requests
import re


def validate_and_extract_mobile_number(phone_number):
    """
    Validates if a given string is a USA or India mobile number and extracts
    the mobile number without any extension.

    Args:
        phone_number (str): The phone number string to validate.

    Returns:
        str or None: The extracted mobile number (without extension) if valid,
                     otherwise None.
    """
    us_mobile_regex = re.compile(r"^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*(?=[2-9])\d{3}\s*\)|(?=[2-9])\d{3}[.-]?)\s*(?=[2-9])\d{3}[.-]?\d{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*\d+)?$", re.IGNORECASE)
    india_mobile_regex = re.compile(r"^(?:(?:\+|0{0,2})91(?:[\s-]*)?|[0])?[6-9]\d{9}(?:\s*(?:#|x\.?|ext\.?|extension)\s*\d+)?$", re.IGNORECASE)

    us_match = us_mobile_regex.fullmatch(phone_number)
    if us_match:
        # Remove non-digit characters except the leading '+' if present
        cleaned_number = re.sub(r"[^\d+]", "", phone_number)
        # Remove the country code if present and return the 10-digit number
        if cleaned_number.startswith("+1"):
            return cleaned_number[2:]
        elif cleaned_number.startswith("1"):
            return cleaned_number[1:]
        else:
            return cleaned_number

    india_match = india_mobile_regex.fullmatch(phone_number)
    if india_match:
        cleaned_number = re.sub(r"[^\d+]", "", phone_number)
        if cleaned_number.startswith("+91"):
            return cleaned_number[3:]
        elif cleaned_number.startswith("91"):
            return cleaned_number[2:]
        elif cleaned_number.startswith("0"):
            return cleaned_number[1:]
        else:
            return cleaned_number

    return None


def update_phone_number(state: AgentState):
    print('########update phone number################')
    print(state['phone_number'])

    today=date.today()
    effective_date=today.strftime('%Y-%m-%d')


    if state['phone_number']:
        phone_number = validate_and_extract_mobile_number(state['phone_number'])

        if phone_number and state['can_update'] =="yes" and state['self_update']=="yes":

            if state["domainid"]:

                response_emp=redis_client.hget("workers_info",state["domainid"])
                # print('#################')
                # print(type(response_emp))
                response=json.loads(response_emp)
                # print(type(response))
                print(response['associate']['AssociateID'])

                Associate_ID=str(response['associate']['AssociateID'])


                if Associate_ID.lower().startswith('c'):
                    payload =  f"<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<env:Envelope\r\n    xmlns:env=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n    xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n    xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\">\r\n    <env:Header>\r\n        <wsse:Security env:mustUnderstand=\"1\">\r\n            <wsse:UsernameToken>\r\n       <wsse:Username>ISU_INT853a_DHRA_Workforce_Agent@elevancehealth3</wsse:Username>\r\n                <wsse:Password\r\n                    Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText\">DHRAAgent@12345</wsse:Password>\r\n      </wsse:UsernameToken>\r\n        </wsse:Security>\r\n    </env:Header>\r\n\t<env:Body>\r\n\t\t<wd:Change_Work_Contact_Information_Request\r\n            xmlns:wd=\"urn:com.workday/bsvc\"\r\n            wd:version=\"v44.0\">\r\n\t\t\t<wd:Business_Process_Parameters>\r\n\t\t\t\t<wd:Auto_Complete>true</wd:Auto_Complete>\r\n\t\t\t\t<wd:Run_Now>true</wd:Run_Now>\r\n\t\t\t\t<wd:Discard_On_Exit_Validation_Error>true</wd:Discard_On_Exit_Validation_Error>\r\n\t\t\t</wd:Business_Process_Parameters>\r\n\t\t\t<wd:Change_Work_Contact_Information_Data>\r\n\t\t\t\t<wd:Person_Reference>\r\n\t\t\t\t\t<wd:ID wd:type=\"Contingent_Worker_ID\">{Associate_ID}</wd:ID>\r\n\t\t\t\t</wd:Person_Reference>\r\n\t\t\t\t<wd:Event_Effective_Date>{str(effective_date)}</wd:Event_Effective_Date>\r\n\t\t\t\t<wd:Person_Contact_Information_Data>\r\n\t\t\t\t\t<wd:Person_Phone_Information_Data wd:Replace_All=\"true\">\r\n\t\t\t\t\t\t<wd:Phone_Information_Data wd:Delete=\"false\">\r\n\t\t\t\t\t\t\t<wd:Phone_Data>\r\n\t\t\t\t\t\t\t\t<wd:Device_Type_Reference>\r\n\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Phone_Device_Type_ID\">PHONE_TYPE_MOBILE</wd:ID>\r\n\t\t\t\t\t\t\t\t</wd:Device_Type_Reference>\r\n\t\t\t\t\t\t\t\t<wd:Country_Code_Reference>\r\n\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Country_Phone_Code_ID\">USA_1</wd:ID>\r\n\t\t\t\t\t\t\t\t</wd:Country_Code_Reference>\r\n\t\t\t\t\t\t\t\t<wd:Complete_Phone_Number>{phone_number}</wd:Complete_Phone_Number>\r\n\t\t\t\t\t\t\t</wd:Phone_Data>\r\n\t\t\t\t\t\t\t<wd:Usage_Data wd:Public=\"true\">\r\n\t\t\t\t\t\t\t\t<wd:Type_Data wd:Primary=\"true\">\r\n\t\t\t\t\t\t\t\t\t<wd:Type_Reference>\r\n\t\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Communication_Usage_Type_ID\">Work</wd:ID>\r\n\t\t\t\t\t\t\t\t\t</wd:Type_Reference>\r\n\t\t\t\t\t\t\t\t</wd:Type_Data>\r\n\t\t\t\t\t\t\t</wd:Usage_Data>\r\n\t\t\t\t\t\t</wd:Phone_Information_Data>\r\n\t\t\t\t\t</wd:Person_Phone_Information_Data>\r\n\t\t\t\t</wd:Person_Contact_Information_Data>\r\n\t\t\t</wd:Change_Work_Contact_Information_Data>\r\n\t\t</wd:Change_Work_Contact_Information_Request>\r\n\t</env:Body>\r\n</env:Envelope>"
                else:
                    payload =  f"<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<env:Envelope\r\n    xmlns:env=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n    xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n    xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\">\r\n    <env:Header>\r\n        <wsse:Security env:mustUnderstand=\"1\">\r\n            <wsse:UsernameToken>\r\n       <wsse:Username>ISU_INT853a_DHRA_Workforce_Agent@elevancehealth3</wsse:Username>\r\n                <wsse:Password\r\n                    Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText\">DHRAAgent@12345</wsse:Password>\r\n      </wsse:UsernameToken>\r\n        </wsse:Security>\r\n    </env:Header>\r\n\t<env:Body>\r\n\t\t<wd:Change_Work_Contact_Information_Request\r\n            xmlns:wd=\"urn:com.workday/bsvc\"\r\n            wd:version=\"v44.0\">\r\n\t\t\t<wd:Business_Process_Parameters>\r\n\t\t\t\t<wd:Auto_Complete>true</wd:Auto_Complete>\r\n\t\t\t\t<wd:Run_Now>true</wd:Run_Now>\r\n\t\t\t\t<wd:Discard_On_Exit_Validation_Error>true</wd:Discard_On_Exit_Validation_Error>\r\n\t\t\t</wd:Business_Process_Parameters>\r\n\t\t\t<wd:Change_Work_Contact_Information_Data>\r\n\t\t\t\t<wd:Person_Reference>\r\n\t\t\t\t\t<wd:ID wd:type=\"Employee_ID\">{Associate_ID}</wd:ID>\r\n\t\t\t\t</wd:Person_Reference>\r\n\t\t\t\t<wd:Event_Effective_Date>{str(effective_date)}</wd:Event_Effective_Date>\r\n\t\t\t\t<wd:Person_Contact_Information_Data>\r\n\t\t\t\t\t<wd:Person_Phone_Information_Data wd:Replace_All=\"true\">\r\n\t\t\t\t\t\t<wd:Phone_Information_Data wd:Delete=\"false\">\r\n\t\t\t\t\t\t\t<wd:Phone_Data>\r\n\t\t\t\t\t\t\t\t<wd:Device_Type_Reference>\r\n\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Phone_Device_Type_ID\">PHONE_TYPE_MOBILE</wd:ID>\r\n\t\t\t\t\t\t\t\t</wd:Device_Type_Reference>\r\n\t\t\t\t\t\t\t\t<wd:Country_Code_Reference>\r\n\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Country_Phone_Code_ID\">USA_1</wd:ID>\r\n\t\t\t\t\t\t\t\t</wd:Country_Code_Reference>\r\n\t\t\t\t\t\t\t\t<wd:Complete_Phone_Number>{phone_number}</wd:Complete_Phone_Number>\r\n\t\t\t\t\t\t\t</wd:Phone_Data>\r\n\t\t\t\t\t\t\t<wd:Usage_Data wd:Public=\"true\">\r\n\t\t\t\t\t\t\t\t<wd:Type_Data wd:Primary=\"true\">\r\n\t\t\t\t\t\t\t\t\t<wd:Type_Reference>\r\n\t\t\t\t\t\t\t\t\t\t<wd:ID wd:type=\"Communication_Usage_Type_ID\">Work</wd:ID>\r\n\t\t\t\t\t\t\t\t\t</wd:Type_Reference>\r\n\t\t\t\t\t\t\t\t</wd:Type_Data>\r\n\t\t\t\t\t\t\t</wd:Usage_Data>\r\n\t\t\t\t\t\t</wd:Phone_Information_Data>\r\n\t\t\t\t\t</wd:Person_Phone_Information_Data>\r\n\t\t\t\t</wd:Person_Contact_Information_Data>\r\n\t\t\t</wd:Change_Work_Contact_Information_Data>\r\n\t\t</wd:Change_Work_Contact_Information_Request>\r\n\t</env:Body>\r\n</env:Envelope>"


            url = "https://wd2-impl-services1.workday.com/ccx/service/elevancehealth3/Human_Resources/v44.0"


            headers = {
            'Content-Type': 'application/xml',
            'Cookie': 'TS012df9cf=0141bf7902e85a03207ac8946c9531dcab8ecf0bcfaedb7a4263535bbf5fc2e5dccdda4c85b239d9f1d43187e2029b58bebc322c95'
            }

            response = requests.request("POST", url, headers=headers, data=payload)

            print(response.text)

            api_response=response.text

        elif state['can_update'] =="no" or state['self_update']=="no":
            api_response=''' <?xml version="1.0" encoding="UTF-8"?><response><status>ERROR</status><message>The Phone number update was not successful. You can able to update only  your Work Phone number</message><errorCode>1001</errorCode></response>'''

        else: api_response=''' <?xml version="1.0" encoding="UTF-8"?><response><status>ERROR</status><message>Invalid mobile number format.</message><errorCode>1001</errorCode><details>The provided mobile number does not adhere to the expected format for either USA or India. Please ensureyou enter a valid mobile number.</details></response>'''

    prompt=f'''You are a friendly, helpful conversational agent for inquiries related to user phone number update or change request,Respond onlyfrom the given question and xml response. Here is the user question: {state["query"]}.
    Here is the API XML response:
    {api_response}

    Note: Check only the given xml and respond whether phone number updaete or not, add if any reason mentioned.Do not mention the XML, the datasource,or any reference.
    '''
    return {"prompt":prompt,"end_point": "/v2/text/chats","pre_task":"update_phone_number"}