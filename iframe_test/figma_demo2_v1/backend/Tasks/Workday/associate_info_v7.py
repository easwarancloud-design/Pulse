from modules.agent_dbs import redis_client
from modules.agent_state import AgentState,mapping
from modules.workflow_utils import replace_short_names,extract_date_parts
import json
from datetime import date, datetime, timedelta
import ast
from dateutil.relativedelta import relativedelta


def get_employeeinfo(state: AgentState):
    prompt=get_employeeinfo_prompt(state) 
    # print('associate prompt:',prompt)
    return {"prompt": prompt,"end_point": "/v2/text/chats","pre_task":"get_employeeinfo"}

def get_employeeinfo_prompt(state):
    domainid = str(state['domainid'])
    response_emp = redis_client.hget(f"in_demographicinfo:{domainid}", "data")

    if response_emp is None:
        store_associateinfo(domainid)
        response_emp = redis_client.hget(f"in_demographicinfo:{domainid}", "data")

    if response_emp:
        response_emp = replace_short_names(json.loads(response_emp), mapping)

    Last_Updated = redis_client.get("workforceagent_as_of_date")
    as_of_date = ""
    if Last_Updated:
        last_updated = json.loads(Last_Updated)
        as_of_date = last_updated.get('Demographic_as_of_date', "")

    date_context = get_date_context()

    if state["include_birthdays"] == "yes":
        print("include_birthdays prompt")
        prompt = generate_prompt("birthday", response_emp, as_of_date, date_context)

    elif state["include_anniversaries"] == "yes":
        print("include_anniversaries prompt")
        prompt = generate_prompt("anniversary", response_emp, as_of_date, date_context)

    elif state.get("include_job_profile_duration") == "yes":
        print("include_job_profile_duration prompt")
        prompt = generate_prompt("job_profile", response_emp, as_of_date, date_context)
    else:
        print("default associate prompt")
        prompt = generate_prompt("default", response_emp, as_of_date, date_context)

    return prompt

def generate_prompt(template_type, response_emp, as_of_date, date_context):
    base_intro = "You are a friendly, helpful conversational agent for inquiries about {} information for the user and their direct reportees. Use only the provided JSON object to generate your response."
    template_notes = {
        "job_profile": '''
        - For job profile queries, include both the **duration** and the **current position title** (e.g., Business Title or Job Title).
        - Format responses like: "**<First_Name> <Last_Name>** has been in their current position (**<Job_Title>**) for <duration>."
        - If the user asks about their own role, respond with: "You have been in your current position (**<Job_Title>**) for <duration>."
        ''',
            "birthday": "",
            "anniversary": "",
        
        }


    if template_type == "birthday":
        topic = "birthday"
        definitions = "Birthday-related query definitions"
        match_logic = 'Date_of_Birth'
        today_response = '**<First_Name>**\'s birthday is today.'
        self_response = 'Happy Birthday, **<First_Name>**!'
        job_profile_note = template_notes.get(template_type, "")
    elif template_type == "anniversary":
        topic = "work anniversary"
        definitions = "Work anniversary-related query definitions"
        match_logic = 'Continuous_Service_Date'
        today_response = '**<First_Name>**\'s work anniversary is today.'
        self_response = 'Happy Work Anniversary, **<First_Name>**!'
        job_profile_note = template_notes.get(template_type, "")
    elif template_type == "job_profile":
        topic = "time in current position"
        definitions = "Job profile duration-related query definitions"
        match_logic = "Time_in_Job_Profile"
        today_response = "**<First_Name>** has been in their current role for the longest duration."        
        self_response = "You have been in your current position for **<duration>**."
        job_profile_note = template_notes.get(template_type, "")
    else:
        return f'''You are a friendly, helpful conversational agent for inquiries about associate information(myself, my direct reportees). Based on the given JSON object.

        You must only respond with information found directly within that JSON. Do not generate any information beyond what is present in the provided JSON.

        In the Demographic JSON, 'associate' refers to my details, and 'subordinate' refers to my direct reportees.  You must consider 'all' the json elements 'beginning to end; to provide your response, and list all the matching entries, NOT just few.

        For queries related to demographic, include the latest data timestamp using the format:
        "As of [Mon dd, YYYY at HH:MM AM/PM], [response]".
        You may place the timestamp either at the beginning or the end of your response—choose what makes the answer clearer and more natural based on length and context.
        [Check for Birthdays/Anniversaries on today's date {date.today()}]

        If the "Date_of_Birth"(format:Mon dd) or "Continuous_Service_Date" as "Work Anniversary" (format:mm/dd/yyyy) matches with todays date of any individual with in my direct reportees,  Inform the user with "Subordinate first name" Birthday or work anniversary is Today.

        If the "Date_of_Birth" (format: "Mon dd") or "Continuous_Service_Date" as "Work Anniversary" (format:mm/dd/yyyy) matches for associate(myself), respond/wish with accordinagly, Happy Birthday! firstname or Happy Work Anniversary!(with current role).

        Provide a direct, concise answer. Do not mention the JSON, the data source, or any reference.

        Answer as a sentence, unless the query requires a different format as specified below.
        Below is the Demographic JSON, which starting and ending using ~ character :~ {response_emp} ~
        Given JSON as of date: {as_of_date}
        If the user's query cannot be fully answered using the available JSON, acknowledge the limitation politely and offer a helpful next step. If appropriate, suggest checking with their manager or, only when clearly needed, mention that a live support agent may be able to assist further. Use varied, empathetic phrasing. Do not mention “live agent” unless necessary.

        Note:
        To give you an accurate answer, please review the earlier messages.
        Adapt your response format to the user's query:
        Single-line responses: Use plain text for simple answers.
        Lists: Use bullet points (*) for lists of items.
        Steps: Use numbered steps or bullet points with sequential information.
        Emphasis: Use bold text (text) for important keywords or phrases.
        New lines: Use new lines for better readability when necessary.
        If the user says "Hi" or "Hello", Generate single, friently greeting suitable for the begining of a conversation with a user. make it somewhat varied and not always exact same.
        Prioritize clarity and brevity. Choose the most appropriate format to effectively convey the information.'''


    return f'''
{base_intro.format(topic)}

You must respond strictly based on the data available in the JSON. Do not generate or infer any information beyond what is present.

In the JSON:
- "myself" refers to the user's own details, including {topic} information.
- "reportee" refers to the user's direct reportees, including their {topic} information.

Always respond from the user's perspective. For example, say “you and your reportees” instead of “myself and my reportees.”

You must evaluate all entries from beginning to end and include all matching results. Do not summarize or omit valid matches.

Date context:
- Today's date is {date_context["today_str"]}.
- The current month is {date_context["current_month"]}.
- The previous three months are: {', '.join(map(str, date_context["previous_months"]))}.
- The next three months are: {', '.join(map(str, date_context["next_months"]))}.
- The current week starts on {date_context["current_week_start"]} and ends on {date_context["current_week_end"]}.
- The previous week was {date_context["previous_week_start"]} to {date_context["previous_week_end"]}.
- The next week is {date_context["next_week_start"]} to {date_context["next_week_end"]}.
- The upcoming week ends on {date_context["upcoming_week_end"]}.
- The upcoming month ends on {date_context["upcoming_month_end"]}.

{definitions}:
- “Upcoming” refers to entries occurring between today and upcoming_month_end, unless the user specifies a different timeframe.
- “Upcoming week” means the next 7 days.
- “Upcoming month” means the next 30 days.
- “Next month” refers to the full calendar month following the current month.
- “Next 3 months” refers to the next three calendar months.

{job_profile_note}

Response formatting rules:
- Include the latest data timestamp using the format:
  "Last refreshed on [Mon dd, YYYY at HH:MM AM/PM], [response]".
- If the `{match_logic}` matches today's date for any reportee, respond with:
  {today_response}
- If the `{match_logic}` matches today's date for the user, respond with:
  {self_response}
- If the user asks about entries in a specific month, return all matching entries.
- If no matches are found, respond politely and clearly.

Do not mention the JSON, the data source, or any technical references.

Answer in a natural, conversational tone. Use the format best suited to the query:
- Single-line responses for simple answers.
- Bullet points (*) for lists of names or dates.
- Bold important keywords or names.
- Use new lines for readability when listing multiple entries.

If the query cannot be answered using the available JSON, acknowledge the limitation politely and offer a helpful next step. Only mention a live support agent if clearly necessary.

Details JSON is enclosed between ~ characters:
~ {response_emp} ~
Last refreshed date: {as_of_date}
'''

def get_date_context():
    today = datetime.now()
    today_str = today.strftime("%B %d, %Y")
    current_month = today.month
    previous_months = [(today - relativedelta(months=i)).month for i in range(1, 4)]
    next_months = [(today + relativedelta(months=i)).month for i in range(1, 4)]
    upcoming_week_end = today + timedelta(days=7)
    upcoming_month_end = today + timedelta(days=30)

    def get_week_range(ref_date):
        start = ref_date - timedelta(days=ref_date.weekday())
        end = start + timedelta(days=6)
        return start.strftime("%B %d, %Y"), end.strftime("%B %d, %Y")

    current_week_start, current_week_end = get_week_range(today)
    previous_week_start, previous_week_end = get_week_range(today - timedelta(weeks=1))
    next_week_start, next_week_end = get_week_range(today + timedelta(weeks=1))

    return {
        "today_str": today_str,
        "current_month": current_month,
        "previous_months": previous_months,
        "next_months": next_months,
        "upcoming_week_end": upcoming_week_end.strftime("%B %d, %Y"),
        "upcoming_month_end": upcoming_month_end.strftime("%B %d, %Y"),
        "current_week_start": current_week_start,
        "current_week_end": current_week_end,
        "previous_week_start": previous_week_start,
        "previous_week_end": previous_week_end,
        "next_week_start": next_week_start,
        "next_week_end": next_week_end
    }

def format_work_anniversary(raw_date_str):
    try:
        # Split into date and length of service
        date_part, length_part = raw_date_str.split("(", 1)
        date_part = date_part.strip()
        length_of_service = length_part.strip(") ").strip()

        # Parse the date
        parsed_date = datetime.strptime(date_part, "%d-%b-%Y")

        # Format the output dictionary
        return {
            "start_date": parsed_date.strftime("%Y-%m-%d"),
            "month": parsed_date.month,
            "day": parsed_date.day,
            "length_of_service": length_of_service,
            "display": f"{parsed_date.strftime('%d-%b-%Y')} ({length_of_service})"
        }

    except Exception as e:
        print(f"Error parsing date: {e}")
        return raw_date_str

def format_date_of_birth(dob_str):
    try:
        # Split the string into month abbreviation and day
        month_str, day_str = dob_str.split("-")
        # Convert month abbreviation to month number
        month_num = datetime.strptime(month_str, "%b").month
        # Format display string
        display = f"{month_str}-{day_str}"
        return {
            "month": month_num,
            "day": int(day_str),
            "display": display
        }
    except Exception as e:
        print(f"Error parsing Date_of_Birth: {e}")
        return dob_str

import re

def parse_time_in_job_profile(duration_str):
    try:
        years = int(re.search(r'(\d+)\s+Years?', duration_str).group(1))
        months = int(re.search(r'(\d+)\s+Month', duration_str).group(1))
        days = int(re.search(r'(\d+)\s+Day', duration_str).group(1))

        return {
            "years": years,
            "months": months,
            "days": days,
            "display": f"{years} Years, {months} Months, {days} Days"
        }
    except Exception as e:
        print(f"Error parsing Time_in_Job_Profile: {e}")
        return {"display": duration_str}

def store_associateinfo(domainid):
    print('store_associateinfo')
    Associate=redis_client.hget("demographic_info",domainid)
    response_emp={}
    if Associate is not None:
        response_emp=json.loads(Associate)
        if 'associate' in response_emp and 'TJP' in response_emp['associate']:
                response_emp['associate']['TJP'] = parse_time_in_job_profile(extract_date_parts(response_emp['associate']['TJP']))
        if 'associate' in response_emp and 'CSD' in response_emp['associate']:
            csd = response_emp['associate']['CSD']
            if csd:
                formatted = extract_date_parts(csd)
                try:
                    data_csd=datetime.strptime(csd,"%m/%d/%Y")
                    csd=data_csd.strftime("%d-%b-%Y")
                except:
                    csd=csd
            response_emp['associate']['CSD'] = format_work_anniversary(f"{csd} ({formatted})")
        if 'associate' in response_emp and 'DOB' in response_emp['associate']:
            response_emp['associate']['DOB']=format_date_of_birth(response_emp['associate']['DOB'])

        # print(response_emp)
        sub_ordinates=response_emp.get('subordinates',None)
        subordinates_list=[]        

        if isinstance(sub_ordinates, str):
            # sub_ordinates = ast.literal_eval(sub_ordinates)
            try:   
                    # print("sub_ordinates1:",sub_ordinates)
                    sub_ordinates = ast.literal_eval(sub_ordinates)
                    # print("sub_ordinates2:",sub_ordinates)
                    if not isinstance(sub_ordinates, list):
                        sub_ordinates = []
            except (ValueError, SyntaxError):
                    sub_ordinates = []
        # print("sub_ordinates3:",sub_ordinates)
        if sub_ordinates:
        
            for sub_ordinate in sub_ordinates:
                subordinate_info={}               
                    
                subordinate=redis_client.hget("demographic_info",str(sub_ordinate))
                # print(subordinate)
                if subordinate is not None:
                    subordinate=json.loads(subordinate)
                    subordinate_info = subordinate.get('associate', {})    
                    # print(subordinate_info)
                    if subordinate_info.get('TJP'):
                        subordinate_info['TJP'] = parse_time_in_job_profile(extract_date_parts(subordinate_info['TJP']))
                    if subordinate_info.get('CSD'):
                        csd = subordinate_info.get('CSD',None)
                        if csd:
                            formatted = extract_date_parts(csd)
                            try:
                                data_csd=datetime.strptime(csd,"%m/%d/%Y")
                                csd=data_csd.strftime("%d-%b-%Y")
                            except:
                                # print('date not converted')
                                csd=csd
                        subordinate_info['CSD'] = format_work_anniversary(f"{csd} ({formatted})")
                    if subordinate_info.get('DOB'):
                        subordinate_info['DOB']=format_date_of_birth(subordinate_info['DOB'])

                subordinates_list.append(subordinate_info)
            response_emp['subordinates']=subordinates_list

        # redis_client.hset(f"in_demographicinfo:{state['domainid']}", str(response_emp))
        redis_client.hset(f"in_demographicinfo:{domainid}", "data", json.dumps(response_emp))
        redis_client.expire(f"in_demographicinfo:{domainid}", 900)
    return response_emp

# x=store_associateinfo('AG15668')
