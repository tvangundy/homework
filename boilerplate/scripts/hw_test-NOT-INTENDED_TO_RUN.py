#!/usr/bin/python

import sys, os, json
import env, env_globals
import ws, ws_globals
import commands
import pprint

from optparse import OptionGroup
from env import Environment
from ws import WS


tests = [{'name': 'create_user1',  'commands': ["hw_test create user1_first user1_last user1_hire_date user1_role"]},
		 {'name': 'replace_user1', 'commands': ["hw_test replace_by_id <id> user1_new_first user1_new_last user1_new_hire_date user1_new_role"]},
		 {'name': 'get_by_id', 	  'commands': ["hw_test get_by_id <id>"]},
		 {'name': 'get_all', 	  'commands': ["hw_test get_all"]},
		 {'name': 'delete_by_id', 'commands': ["hw_test delete_by_id <id>"]},
		 {'name': 'load_table',   'commands': ["hw_test create user1_first user1_last user1_hire_date user1_role",
		 										"hw_test create user2_first user2_last user2_hire_date user2_role",
												"hw_test create user3_first user3_last user3_hire_date user3_role"]}]


#------------------------------------------------------------------------------
# Function: help
#------------------------------------------------------------------------------
def help (env):

	print ""
	print ">>>>>> hw_test help <<<<<<"
	print ""
	print "Examples,"
	print "> hw_test create <first_name> <last_name> <hireDate> <role>"
	print "> hw_test replace_by_id <id>"
	print "> hw_test get_by_id <id>"
	print "> hw_test get_all"
	print "> hw_test delete_by_id <id>"
	print "> hw_test tests"
	print "> hw_test test <test_name>"
	print ""

	
def run_test (env, test_item, id):

	for command_item in test_item['commands']:

		command = None

		if command_item.find("<id>") != -1:
			if id != None:
				command = command_item.replace("<id>", id)

				print ("command = " + command)

			else:
				print ("ERROR: Unable to call command because id is not found")
		else:
			command = command_item

		if command != None:
			output = env.print_exec_get_output (command)
			print ("__________________________")
			print (output)
			print ("__________________________")

		

#------------------------------------------------------------------------------
# Function: execute
#------------------------------------------------------------------------------
def execute (env):

	error = False

	ws = WS(env)

	COMMAND = "curl -X "
	URL = " \"http://localhost:3000/api/employees\""
	URL_ID = " \"http://localhost:3000/api/employees/:id\""
	# OPTIONS = " -i  -H 'Content-Type: application/json' "
	OPTIONS = "  -H 'Content-Type: application/json' "


	# Do not report Success/Pass
	env.options.quiet = True

	# Set local references to environment objects
	utils = env.utils

	if env.args[0] == "help":
		help(env)
		return error

	command = "help"

	# Perform action
	# COMMAND: CREATE
	if env.args[0] == "create" or \
		env.args[0] == "replace_by_id" or \
		env.args[0] == "get_by_id" or \
		env.args[0] == "get_all" or \
		env.args[0] == "delete_by_id" or \
		env.args[0] == "tests" or \
		env.args[0] == "test":
		command = env.args[0]
	else:
		print ("ERROR: No valid command specified")
		print ("")
		env.print_and_exec("hw_test help")
		return error

	if command == "tests":
		for test_item in tests:
			print (test_item['name'])
		return
	elif command == "test" and len(env.args) >= 2:
		test_name = env.args[1]
		id = None

		if len(env.args) == 3:
			id = env.args[2]

		for test_item in tests:
			if test_item['name'] == test_name:
				run_test (env, test_item, id)
		return


	# CREATE
	if command == "create":
		if len(env.args) == 5:
			firstName = "\"firstName\":" + "\"" + env.args[1] + "\","
			lastName = "\"lastName\":" + "\"" + env.args[2] + "\","
			hireDate = "\"hireDate\":" + "\"" + env.args[3] + "\","
			role = "\"role\":" + "\"" + env.args[4] + "\""
			data = "-d $'{" + firstName + lastName + hireDate + role + "}'"
			env.print_and_exec ( COMMAND + "\"POST\"" + URL + OPTIONS + data)
		else:
			print ("ERROR: Invalid number of arguments passed")

	# REPLACE_BY_ID
	elif command == "replace_by_id":
		if len(env.args) == 6:
			id = "\"id\":" + "\"" + env.args[1] + "\","
			firstName = "\"firstName\":" + "\"" + env.args[2] + "\","
			lastName = "\"lastName\":" + "\"" + env.args[3] + "\","
			hireDate = "\"hireDate\":" + "\"" + env.args[4] + "\","
			role = "\"role\":" + "\"" + env.args[5] + "\""
			data = "-d $'{" + id + firstName + lastName + hireDate + role + "}'"
			env.print_and_exec ( COMMAND + "\"PUT\"" + URL_ID + OPTIONS + data)
		else:
			print ("ERROR: Invalid number of arguments passed")
	# GET_BY_ID
	elif command == "get_by_id":
		if len(env.args) == 2:
			id = "\"id\":" + "\"" + env.args[1] + "\""
			data = "-d $'{" + id + "}'"
			env.print_and_exec ( COMMAND + "\"GET\"" + URL_ID + OPTIONS + data)
		else:
			print ("ERROR: Invalid number of arguments passed")
	# GET_ALL
	elif command == "get_all":

		if len(env.args) == 1:
			env.print_and_exec ( COMMAND + "\"GET\"" + URL + OPTIONS)
		else:
			print ("ERROR: Invalid number of arguments passed")
	# DELETE_BY_ID
	elif command == "delete_by_id":
		if len(env.args) == 2:
			id = "\"id\":" + "\"" + env.args[1] + "\""
			data = "-d $'{" + id + "}'"
			env.print_and_exec ( COMMAND + "\"DELETE\"" + URL_ID + OPTIONS + data)
		else:
			print ("ERROR: Invalid number of arguments passed")
	else:
		print ("Invalid command name given : " + command)

	# if env.options.print_only:
	# 	env.print_and_exec_anyway ( command)
	# else:
	# 	env.print_and_exec ( command)

	# Report Error Status
	if env.options.quiet == False:
		print ("Error: %s" % error)

	return error

#------------------------------------------------------------------------------
# Function: custom_options_cb
#
# NOTE: This function is called back during parser creation.  It
#       adds all custom options to the default parser
#------------------------------------------------------------------------------
# def custom_options_cb(parser):

# 	parser.add_option("-d", "--deamon",
# 					  action="store_true", dest="daemon",
# 					  help="Run as deamon")

#------------------------------------------------------------------------------
# Function: main
#------------------------------------------------------------------------------
def main():

	# Define if argument requirements
	exact_count = -1	# Set to -1 to disable exact arg checking
	min_count 	= 1    # Set to -1 to disable min arg checking
	max_count   = -1    # Set to -1 to disable max arg checking

	summary = "IBM Homework test script"
	usage   = "usage: %prog [options] <test_name> <args>"

	# Set the add custom options callback if necessary
	add_custom_options_cb = 0 # custom_options_cb

	# Allocate and initialize the scripts environment
	env = Environment(os.path.basename(__file__),
					  usage,
					  summary,
					  exact_count,
					  min_count,
					  max_count,
					  add_custom_options_cb)

	# Execute script specific functionality
	if env.error == False and env.complete == False:
		env.error = execute (env)

	# Exit the program
	env.exit()


#------------------------------------------------------------------------------
# Script Entry Point
#------------------------------------------------------------------------------
if __name__ == "__main__":
	main()



